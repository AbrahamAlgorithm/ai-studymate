import { createContext } from "react";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import run from "../config/gemini";
import { auth, db } from "../firebase";

export const Context = createContext();

const ContextProvider = (props) => {
    const [input, setInput] = useState("");
    const [recentPrompt, setRecentPrompt] = useState("");
    const [prevPrompts, setPrevPrompts] = useState([]);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [themeMode, setThemeMode] = useState(() => {
        const saved = localStorage.getItem("studymate_theme_mode");
        return saved === "light" ? "light" : "dark";
    });

    const responseTimeoutsRef = useRef([]);

    useEffect(() => {
        localStorage.setItem("studymate_theme_mode", themeMode);
    }, [themeMode]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user || null);
            setAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const loadHistory = async () => {
            if (!currentUser?.uid) {
                setPrevPrompts([]);
                setRecentPrompt("");
                setResultData("");
                setShowResult(false);
                return;
            }

            try {
                const historyRef = collection(db, "users", currentUser.uid, "history");
                const historyQuery = query(historyRef, orderBy("createdAt", "asc"));
                const snapshot = await getDocs(historyQuery);

                const historyItems = snapshot.docs.map((item) => {
                    const data = item.data();
                    return {
                        id: item.id,
                        prompt: data.prompt || "",
                        response: data.response || "",
                    };
                });

                setPrevPrompts(historyItems);
            } catch (_error) {
                setPrevPrompts([]);
            }
        };

        loadHistory();
    }, [currentUser]);

    useEffect(() => {
        return () => {
            responseTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
            responseTimeoutsRef.current = [];
        };
    }, []);

    const clearAnimatedResponse = () => {
        responseTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        responseTimeoutsRef.current = [];
    };

    const delayPara = (index, nextWord) => {
        const timeoutId = setTimeout(() => {
            setResultData((prev) => prev + nextWord);
        }, 75 * index);

        responseTimeoutsRef.current.push(timeoutId);
    };

    const formatResponse = (rawResponse) => {
        const responseText = (rawResponse || "").toString();
        const responseArray = responseText.split("**");
        let newResponse = "";

        for (let i = 0; i < responseArray.length; i++) {
            if (i === 0 || i % 2 !== 1) {
                newResponse += responseArray[i];
            } else {
                newResponse += "<b>" + responseArray[i] + "</b>";
            }
        }

        return newResponse.split("*").join("<br/>");
    };

    const newChat = () => {
        clearAnimatedResponse();
        setLoading(false);
        setShowResult(false);
        setResultData("");
        setInput("");
    };

    const openHistoryItem = (promptObj) => {
        if (!promptObj || loading) {
            return;
        }

        clearAnimatedResponse();
        setRecentPrompt(promptObj.prompt || "");
        setResultData(promptObj.response || "No saved response found for this session.");
        setShowResult(true);
        setInput("");
    };

    const onSent = async (prompt) => {
        const activePrompt = (prompt !== undefined ? prompt : input).trim();
        if (!activePrompt || loading) {
            return;
        }

        clearAnimatedResponse();
        setResultData("");
        setLoading(true);
        setShowResult(true);
        setRecentPrompt(activePrompt);

        const contextWindow = prevPrompts
            .filter((item) => item.response)
            .slice(-8)
            .map((item) => item.prompt + ": " + item.response)
            .join("\n");

        let savedPromptId = null;
        const tempId = `temp-${Date.now()}`;
        setPrevPrompts((prev) => [...prev, { id: tempId, prompt: activePrompt, response: "" }]);

        try {
            if (currentUser?.uid) {
                const createdDoc = await addDoc(collection(db, "users", currentUser.uid, "history"), {
                    prompt: activePrompt,
                    response: "",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                savedPromptId = createdDoc.id;
            }

            const response = await run(contextWindow + "\n" + activePrompt);
            const formattedResponse = formatResponse(response);
            const formattedChunks = formattedResponse.split(" ");

            for (let i = 0; i < formattedChunks.length; i++) {
                delayPara(i, formattedChunks[i] + " ");
            }

            setPrevPrompts((prev) => prev.map((item) => {
                if (item.id !== tempId) {
                    return item;
                }

                return {
                    ...item,
                    id: savedPromptId || item.id,
                    response: formattedResponse,
                };
            }));

            if (currentUser?.uid && savedPromptId) {
                await updateDoc(doc(db, "users", currentUser.uid, "history", savedPromptId), {
                    response: formattedResponse,
                    updatedAt: serverTimestamp(),
                });
            }
        } catch (_error) {
            const fallbackResponse = "Something went wrong while generating your response. Please try again.";
            setResultData(fallbackResponse);

            setPrevPrompts((prev) => prev.map((item) => {
                if (item.id !== tempId) {
                    return item;
                }

                return {
                    ...item,
                    id: savedPromptId || item.id,
                    response: fallbackResponse,
                };
            }));

            if (currentUser?.uid && savedPromptId) {
                await updateDoc(doc(db, "users", currentUser.uid, "history", savedPromptId), {
                    response: fallbackResponse,
                    updatedAt: serverTimestamp(),
                });
            }
        } finally {
            setLoading(false);
            setInput("");
        }
    };

    const logout = async () => {
        clearAnimatedResponse();
        await signOut(auth);
        setPrevPrompts([]);
        setRecentPrompt("");
        setResultData("");
        setShowResult(false);
        setLoading(false);
        setInput("");
    };

    const toggleTheme = () => {
        setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
    };

    const contextValue = {
        prevPrompts,
        setPrevPrompts,
        onSent,
        setRecentPrompt,
        recentPrompt,
        showResult,
        loading,
        resultData,
        input,
        setInput,
        newChat,
        openHistoryItem,
        currentUser,
        authReady,
        logout,
        themeMode,
        toggleTheme,
    };

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    );
};

export default ContextProvider;
