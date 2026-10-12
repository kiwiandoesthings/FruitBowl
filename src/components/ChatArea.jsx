import { useState, useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { apiString, isNullOrWhitespace } from "../scripts/common.ts";

export default function ChatArea({ roomID }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const latestLoadedMessage = useRef(0);
    const earliestLoadedMessage = useRef(Number.MAX_SAFE_INTEGER);
    const latestExistentMessage = useRef(0);
    const earliestExistentMessage = useRef(Number.MAX_SAFE_INTEGER);
	const nextSystemMessageIndex = useRef(-1);
    
    const isLoadingMessages = useRef(false);
    const isPaginating = useRef(false);
    const isPrepending = useRef(false);
    const previousScrollHeight = useRef(0);
    const previousScrollTop = useRef(0);
    
    const connectionReference = useRef(null);
    const chatWindow = useRef(null);
    const inputBox = useRef(null);
    const shouldScrollDown = useRef(false);
    const topTrigger = useRef(null);
    const bottomTrigger = useRef(null);
    const loadMessageAmount = 10;
    const maxLoadedMessages = 500;
    const messageLoadBuffer = 30;

    useEffect(() => {
        const connection = new HubConnectionBuilder().withUrl(apiString + "protocall/live?roomID=" + roomID, {
            withCredentials: true
        }).withAutomaticReconnect().build();

        connectionReference.current = connection;
        
        connection.on("post/messages", (incomingMessages) => {
			console.log(incomingMessages);
			if (incomingMessages.roomID != roomID) {
				return;
			}
            if (incomingMessages.messages.length === 0) {
                isLoadingMessages.current = false;
                isPaginating.current = false;
                return;
            }

            if (chatWindow.current) {
                const currentScrollTop = chatWindow.current.scrollTop;
                const currentScrollHeight = chatWindow.current.scrollHeight;
                const currentClientHeight = chatWindow.current.clientHeight;

                const incomingEarliest = Math.min(...incomingMessages.messages.map(message => message.index));
                
                if (earliestLoadedMessage.current !== Number.MAX_SAFE_INTEGER && incomingEarliest < earliestLoadedMessage.current) {
                    previousScrollHeight.current = currentScrollHeight;
                    previousScrollTop.current = currentScrollTop;
                    isPrepending.current = true;
                } else if (currentScrollHeight - currentScrollTop - currentClientHeight <= 15) {
                    if (!isPaginating.current) {
                        shouldScrollDown.current = true;
                    }
                }
            }

            isLoadingMessages.current = false;
            isPaginating.current = false;

            setMessages((previous) => {
				if (previous.length > maxLoadedMessages) {
                    const halfMax = Math.floor(maxLoadedMessages / 2);
					
                    if (chatWindow.current.scrollHeight - chatWindow.current.scrollTop - chatWindow.current.clientHeight < chatWindow.current.scrollHeight / 2) {
                        //console.log("lower " + previous.length);
                        previous = previous.slice(-halfMax);
						console.log(previous.length);
                    } else {
                        //console.log("upper " + previous.length);
                        previous = previous.slice(0, halfMax);
						console.log(previous.length);
					}
                }

                let combined;
				if (incomingMessages.later) {
					combined = [...previous, ...incomingMessages.messages];
					latestLoadedMessage.current = incomingMessages.messages.at(-1).index;
				} else {
					combined = [...incomingMessages.messages, ...previous];
					earliestLoadedMessage.current = incomingMessages.messages[0].index;
				}

				const real = combined.filter(message => !message.system);
        		earliestLoadedMessage.current = real[0].index;
        		latestLoadedMessage.current = real[real.length - 1].index;

                return combined;
            });
        });

        connection.on("post/room_info", (info) => {
            console.log("Room info: " + JSON.stringify(info));
            earliestExistentMessage.current = info.earliestMessageIndex;
            latestExistentMessage.current = info.latestMessageIndex;
			systemMessage("Successfully connected to room \"" + info.name + "\"");
        });

        connection.on("post/alert", (incomingMessage) => {
            alert(incomingMessage);
        })

        connection.start().then(() => {
                console.log("Connected to KiwiApi");
				systemMessage("Successfully connected to KiwiApi");
                isLoadingMessages.current = true;
                isPaginating.current = true;
                connection.invoke("get/messages", -1, 25, roomID, false);
        }).catch((err) => console.error("Connection error: ", err));
        
        return () => {
            connection.stop();
        };
    }, [roomID]);

    useLayoutEffect(() => {
        if (isPrepending.current) {
            const newScrollHeight = chatWindow.current.scrollHeight;
            chatWindow.current.scrollTop = previousScrollTop.current + (newScrollHeight - previousScrollHeight.current);
            isPrepending.current = false;
        } else if (shouldScrollDown.current) {
            chatWindow.current.scrollTop = chatWindow.current.scrollHeight;
            shouldScrollDown.current = false;
        }
    }, [messages]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
            //console.log("top");
            if (isLoadingMessages.current || earliestLoadedMessage.current === earliestExistentMessage.current) {
				return;
			}

            requestMessages(-loadMessageAmount);
        }
        }, {
            root: chatWindow.current,
            rootMargin: messageLoadBuffer + "px 0px 0px 0px",
            threshold: 0
        });

        if (topTrigger.current) observer.observe(topTrigger.current);
        return () => observer.disconnect();
    }, [roomID, messages]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
            //console.log("bottom");
			console.log(latestExistentMessage.current);
			console.log(latestLoadedMessage.current);
            if (isLoadingMessages.current || latestLoadedMessage.current === latestExistentMessage.current) {
				return;
			}

            requestMessages(loadMessageAmount);
        }
        }, {
            root: chatWindow.current,
            rootMargin: "0px 0px " + messageLoadBuffer + "px 0px",
            threshold: 0
        });

        if (bottomTrigger.current) observer.observe(bottomTrigger.current);
        return () => observer.disconnect();
    }, [roomID]);

    useEffect(() => {
        if (earliestLoadedMessage.current <= earliestExistentMessage.current || isLoadingMessages.current) {
			return;
		}

        if (chatWindow.current.scrollHeight <= chatWindow.current.clientHeight && messages.length > 0) {
            requestMessages(-10);
        }
    }, [messages, roomID]);

	function requestMessages(amount) {
    	isLoadingMessages.current = true;
    	isPaginating.current = true;
    
    	let startIndex = amount > 0 ? latestLoadedMessage.current + 1 : earliestLoadedMessage.current - 1;
    	//console.log(amount);
		//console.log(startIndex);
    	connectionReference.current.invoke("get/messages", startIndex, Math.abs(amount), roomID, amount > 0);
	}

	function systemMessage(text) {
		setMessages((previous) => {
			return [...previous, {
				author: {
					color: "lightblue",
					username: "System"
				},
				index: nextSystemMessageIndex.current,
				content: text,
				timestamp: Date.now(),
				system: true
			}];
		});
		nextSystemMessageIndex.current--;
	}

	const handleSend = (event) => {
        inputBox.current.focus();
        event.preventDefault();
        
        if (isNullOrWhitespace(text)) {
			return;
		}

        shouldScrollDown.current = true;
        connectionReference.current.invoke("post/messages", text, roomID);
        
        setText("");
    };

	const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend(event);
        }
    };

    return (
        <>
        <div id="chat-window" ref={chatWindow}>
            <div key="top-trigger" id="chat-messages-top" className="trigger" ref={topTrigger}></div>
             {messages.map((message) => (
                 <div key={message.index} className="chat-message">
                    <span className="chat-message-author" style={{ color: message.author.color }}>{message.author.username}: </span>
                    <span className="chat-message-content">{message.content}</span>
                    <span className="chat-message-timestamp">{new Date(message.timestamp).toLocaleString(undefined)}</span>
                </div>
            ))}
            <div key="bottom-trigger" id="chat-messages-bottom" className="trigger" ref={bottomTrigger}></div>
        </div>
        <form id="chat-input-area" onSubmit={handleSend}>
            <textarea id="chat-input-box" ref={inputBox} value={text} onInput={(event) => setText(event.target.value)} onKeyDown={handleKeyDown}/>
            <button type="submit">Send</button>
        </form>
        </>
    );
}