import { createContext } from "react";
import React, { useState } from "react";
import run from "../config/gemini";

export const Context = createContext();

const ContextProvider = (props) => {

    const [input,setInput] = useState("");
    const [recentPrompt,setRecentPrompt] = useState("");
    const [prevPrompts,setPrevPrompts] = useState([]);
    const [showResult,setShowResult] = useState(false);
    const [loading,setLoading] = useState(false);
    const [resultData,setResultData] = useState("");


    const delayPara = (index,nextWord) => {
        setTimeout(function () {
            setResultData(prev=>prev+nextWord);
        },75*index)
    }

    const newChat = () => {
        setLoading(false)
        setShowResult(false)
    }

    const onSent = async (prompt) => {

        setResultData("")
        setLoading(true)
        setShowResult(true)

        // Build context from previous prompts
        const context = prevPrompts.map(item => item.prompt + ": " + item.response).join("\n");

        let response;
        if (prompt !== undefined) {
            setPrevPrompts(prev => [...prev, { prompt, response: "" }]);
            response = await run(context + "\n" + prompt);  // Include context in the request
            setRecentPrompt(prompt);
        } else {
            setPrevPrompts(prev => [...prev, { prompt: input, response: "" }]);
            setRecentPrompt(input);
            response = await run(context + "\n" + input);  // Include context in the request
        }
        
        // Same processing for response as before
        let responseArray = response.split("**");
        let newResponse="" ;
        for(let i = 0; i < responseArray.length; i++)
        {
            if (i === 0 || i%2 !== 1) {
                newResponse += responseArray[i];
            }
            else{
                newResponse += "<b>"+responseArray[i]+"</b>";
            }
        }
        let newResponse2 = newResponse.split("*").join("</br>")
        let newResponseArray = newResponse2.split(" ");
        for(let i=0; i<newResponseArray.length;i++)
        {
            const nextWord = newResponseArray[i];
            delayPara(i,nextWord+" ");
        }

        setPrevPrompts(prev => {
            const updatedPrompts = [...prev];
            updatedPrompts[updatedPrompts.length - 1].response = newResponse;
            return updatedPrompts;
        });


        setLoading(false)
        setInput("")
    }

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
        newChat
    }

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    )
}

export default ContextProvider;