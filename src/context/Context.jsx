import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import * as api from "../api/client";
import { auth, db } from "../firebase";

export const Context = createContext();

const YOUTUBE_LINK = /(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?\S*v=|shorts\/|embed\/|live\/)|youtu\.be\/)[\w-]{11}\S*/i;

const DEFAULT_PROMPTS = {
    handout: "Explain this material simply, summarise the key points, then give me a few practice questions.",
    youtube: "Summarise this video by sections with timestamps, explain the key concepts simply, then give me 3 quick check questions.",
};

const QUIZ_FROM_SOURCE = "Quiz me on this source";

const newId = () =>
    (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// old history from before the backend was saved as html
const legacyToMarkdown = (text) => {
    if (!text || !/<br\s*\/?>|<\/?b>/i.test(text)) return text || "";
    return text
        .replace(/<b>(.*?)<\/b>/gis, "**$1**")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?[^>]+>/g, "");
};

const toDate = (value) => (value?.toDate ? value.toDate() : value instanceof Date ? value : null);

const fromDoc = (snap) => {
    const data = snap.data();
    return {
        id: snap.id,
        sessionId: data.sessionId || snap.id,
        mode: data.mode || "ask",
        prompt: data.prompt || "",
        response: legacyToMarkdown(data.response),
        quiz: data.quiz || null,
        quizTitle: data.quizTitle || "",
        quizScore: data.quizScore ?? null,
        video: data.video || null,
        attachment: data.attachment || null,
        error: Boolean(data.error),
        status: data.error ? "error" : "done",
        createdAt: toDate(data.createdAt) || new Date(0),
    };
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

// spell the quiz out so follow up questions about it make sense to the model
const quizAsText = (ex) => {
    const lines = [`Quiz: ${ex.quizTitle || ex.prompt}`];
    for (const q of ex.quiz) {
        lines.push(`${q.id}. ${q.question}`);
        if (q.type === "mcq") {
            q.options.forEach((opt, i) => lines.push(`   ${LETTERS[i]}) ${opt}`));
            lines.push(`   Correct answer: ${LETTERS[q.answerIndex]}) ${q.answer}`);
        } else {
            lines.push(`   Model answer: ${q.answer}`);
        }
        if (q.explanation) lines.push(`   Explanation: ${q.explanation}`);
    }
    if (ex.quizScore) lines.push(`(The student scored ${ex.quizScore.score}/${ex.quizScore.total}.)`);
    return lines.join("\n");
};

const toApiHistory = (exchanges) =>
    exchanges
        .filter((ex) => ex.status === "done" && !ex.error)
        .slice(-10)
        .flatMap((ex) => {
            const answer = ex.quiz ? quizAsText(ex) : ex.response;
            return answer
                ? [{ role: "user", content: ex.prompt }, { role: "assistant", content: answer }]
                : [];
        });

const ContextProvider = (props) => {
    const [input, setInput] = useState("");
    const [history, setHistory] = useState([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [activeMode, setActiveMode] = useState("ask");
    const [activeVideo, setActiveVideo] = useState(null);
    const [quizOptions, setQuizOptions] = useState({ count: 10, difficulty: "mixed", type: "mixed", source: "" });
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [themePreference, setThemePreferenceState] = useState(() => {
        const saved = localStorage.getItem("studymate_theme_preference");
        return ["system", "light", "dark"].includes(saved) ? saved : "system";
    });

    const [systemDark, setSystemDark] = useState(() =>
        window.matchMedia("(prefers-color-scheme: dark)").matches
    );

    const themeMode = themePreference === "system"
        ? (systemDark ? "dark" : "light")
        : themePreference;

    const abortRef = useRef(null);

    useEffect(() => {
        localStorage.setItem("studymate_theme_preference", themePreference);
    }, [themePreference]);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e) => setSystemDark(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user || null);
            setAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    const resetWorkspace = useCallback(() => {
        abortRef.current?.abort();
        setHistory([]);
        setActiveSessionId(null);
        setActiveVideo(null);
        setActiveMode("ask");
        setLoading(false);
        setInput("");
    }, []);

    const uid = currentUser?.uid;

    useEffect(() => {
        if (!uid) {
            resetWorkspace();
            setHistoryLoaded(false);
            return;
        }

        let cancelled = false;
        const loadHistory = async () => {
            try {
                const historyRef = collection(db, "users", uid, "history");
                const snapshot = await getDocs(query(historyRef, orderBy("createdAt", "asc")));
                if (cancelled) return;
                const loaded = snapshot.docs.map(fromDoc);
                const loadedIds = new Set(loaded.map((ex) => ex.id));
                // don't drop anything they asked while this was loading
                setHistory((prev) => [...loaded, ...prev.filter((ex) => !loadedIds.has(ex.id))]);
            } catch (error) {
                console.error("Could not load study history", error);
            } finally {
                if (!cancelled) setHistoryLoaded(true);
            }
        };

        loadHistory();
        return () => { cancelled = true; };
    }, [uid, resetWorkspace]);

    const sessions = useMemo(() => {
        const byId = new Map();
        for (const ex of history) {
            if (!byId.has(ex.sessionId)) {
                byId.set(ex.sessionId, {
                    id: ex.sessionId,
                    title: ex.attachment?.name || ex.video?.title || ex.prompt,
                    mode: ex.mode,
                    exchanges: [],
                });
            }
            const session = byId.get(ex.sessionId);
            session.exchanges.push(ex);
            session.updatedAt = ex.createdAt;
        }
        return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    }, [history]);

    const thread = useMemo(
        () => (activeSessionId ? history.filter((ex) => ex.sessionId === activeSessionId) : []),
        [history, activeSessionId]
    );

    const patchExchange = (id, patch) =>
        setHistory((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)));

    // firestore writes only resolve when the server acks them, so i don't await them or the ui hangs offline
    const exchangeRef = (id) => doc(db, "users", currentUser.uid, "history", id);

    const saveExchange = (id, fields, { create = false } = {}) => {
        if (!currentUser?.uid) return;
        const write = create
            ? setDoc(exchangeRef(id), { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
            : updateDoc(exchangeRef(id), { ...fields, updatedAt: serverTimestamp() });
        write.catch((error) => console.error("Could not save study history", error));
    };

    const loadVideo = async (url, signal) => {
        const info = await api.youtubeInfo(url, { signal });
        const video = { ...info, transcript: info.transcript || [] };
        setActiveVideo(video);
        return video;
    };

    // update patches the exchange while the answer is still coming in
    const runMode = async ({ mode, text, file, priorThread, signal, update }) => {
        const apiHistory = toApiHistory(priorThread);
        const onText = (sofar) => update({ response: sofar, status: "streaming" });

        if (mode === "handout" && file) {
            const data = await api.analyzeHandout({ file, question: text }, { signal, onText });
            return { response: data.response };
        }

        if (mode === "youtube") {
            const link = text.match(YOUTUBE_LINK)?.[0];
            let video = activeVideo;
            let question = text;
            let fresh = false;

            if (link) {
                const url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
                video = await loadVideo(url, signal);
                question = text.replace(link, "").trim() || DEFAULT_PROMPTS.youtube;
                fresh = true;
            } else if (video && !video.transcript && video.videoId) {
                // transcripts aren't saved, so a reopened session has to fetch it again
                video = await loadVideo(`https://www.youtube.com/watch?v=${video.videoId}`, signal);
            }

            if (!video) {
                throw new api.ApiError("Paste a YouTube link first, then ask your question about the video.", 400);
            }

            const card = {
                videoId: video.videoId,
                title: video.title || "",
                channel: video.channel || "",
                thumbnail: video.thumbnail || "",
                transcriptAvailable: Boolean(video.transcriptAvailable),
            };
            update({ video: card }); // show the video while the answer is still coming

            const data = await api.youtubeAsk(
                { video, question, history: fresh ? [] : apiHistory },
                { signal, onText }
            );
            return { response: data.response, video: card };
        }

        // once there's a quiz in the session, new messages are questions about it, not new quizzes
        const quizFollowUp = mode === "quiz" && priorThread.some((ex) => ex.quiz && !ex.error);

        if (mode === "quiz" && !quizFollowUp) {
            const data = await api.generateQuiz({ ...quizOptions, topic: text === QUIZ_FROM_SOURCE ? "" : text }, { signal });
            return { quiz: data.quiz, quizTitle: data.title || text };
        }

        const data = await api.chat(
            { message: text, history: apiHistory, mode: quizFollowUp ? "ask" : mode },
            { signal, onText }
        );
        return { response: data.response };
    };

    const onSent = async (text, { file } = {}) => {
        const mode = activeMode;
        let prompt = (text ?? input).trim();
        if (!prompt && file) prompt = DEFAULT_PROMPTS.handout;
        if (mode === "quiz" && !prompt && quizOptions.source.trim()) prompt = QUIZ_FROM_SOURCE;
        if (!prompt || loading) return;

        const sessionId = activeSessionId || newId();
        const priorThread = history.filter((ex) => ex.sessionId === sessionId);
        // make the doc id up front so the exchange keeps the same id the whole time
        const exchangeId = currentUser?.uid
            ? doc(collection(db, "users", currentUser.uid, "history")).id
            : newId();
        const base = {
            sessionId,
            mode,
            prompt,
            attachment: file ? { name: file.name, size: file.size } : null,
        };

        setActiveSessionId(sessionId);
        setLoading(true);
        setInput("");
        setHistory((prev) => [
            ...prev,
            { ...base, id: exchangeId, response: "", quiz: null, video: null, status: "pending", createdAt: new Date() },
        ]);

        const controller = new AbortController();
        abortRef.current = controller;
        saveExchange(exchangeId, { ...base, response: "" }, { create: true });

        let partial = "";
        const update = (patch) => {
            if ("response" in patch) partial = patch.response;
            patchExchange(exchangeId, patch);
        };

        try {
            const result = await runMode({ mode, text: prompt, file, priorThread, signal: controller.signal, update });
            patchExchange(exchangeId, { ...result, status: "done" });
            saveExchange(exchangeId, result);
        } catch (error) {
            if (error.name === "AbortError") {
                // stopped halfway, keep what they already got
                if (partial) {
                    patchExchange(exchangeId, { response: partial, status: "done" });
                    saveExchange(exchangeId, { response: partial });
                } else {
                    setHistory((prev) => prev.filter((ex) => ex.id !== exchangeId));
                    if (currentUser?.uid) deleteDoc(exchangeRef(exchangeId)).catch(() => {});
                }
                return;
            }
            const message = error.message || "Something went wrong while generating your response. Please try again.";
            patchExchange(exchangeId, { response: message, error: true, status: "error" });
            saveExchange(exchangeId, { response: message, error: true });
        } finally {
            if (abortRef.current === controller) abortRef.current = null;
            setLoading(false);
        }
    };

    const stopGenerating = () => abortRef.current?.abort();

    const recordQuizScore = (exchangeId, score, total) => {
        patchExchange(exchangeId, { quizScore: { score, total } });
        saveExchange(exchangeId, { quizScore: { score, total } });
    };

    const newChat = () => {
        abortRef.current?.abort();
        setLoading(false);
        setActiveSessionId(null);
        setActiveVideo(null);
        setInput("");
    };

    const openSession = (sessionId) => {
        if (loading) return;
        const exchanges = history.filter((ex) => ex.sessionId === sessionId);
        if (!exchanges.length) return;
        const last = exchanges[exchanges.length - 1];
        setActiveSessionId(sessionId);
        setActiveMode(last.mode || "ask");
        const lastVideo = [...exchanges].reverse().find((ex) => ex.video)?.video;
        setActiveVideo(lastVideo ? { ...lastVideo, transcript: null } : null);
        setInput("");
    };

    const changeMode = (mode) => {
        if (mode === activeMode) return;
        setActiveMode(mode);
        // new mode, new session, so the context doesn't mix
        if (activeSessionId) newChat();
    };

    const logout = async () => {
        await signOut(auth);
        resetWorkspace();
    };

    const setThemePreference = (pref) => {
        setThemePreferenceState(pref);
    };

    const contextValue = {
        history,
        historyLoaded,
        sessions,
        thread,
        activeSessionId,
        activeMode,
        changeMode,
        activeVideo,
        quizOptions,
        setQuizOptions,
        onSent,
        stopGenerating,
        recordQuizScore,
        loading,
        input,
        setInput,
        newChat,
        openSession,
        currentUser,
        authReady,
        logout,
        themeMode,
        themePreference,
        setThemePreference,
    };

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    );
};

export default ContextProvider;
