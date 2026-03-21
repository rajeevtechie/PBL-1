import React, { useState } from "react";
import { Send } from "lucide-react";
import styles from "../pages/insights/Insights.module.css";


const Chatbot = () => {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi 👋 I am EduNexus AI Mentor. Ask me anything!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      const aiMessage = {
        role: "ai",
        text: data.reply || "No response from AI",
      };

      setMessages([...newMessages, aiMessage]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMessages,
        { role: "ai", text: "⚠️ Error connecting to AI server" }
      ]);
    }

    setLoading(false);
  };

  return (
    <>
      {/* Header */}
      <div className={styles.chatHeader}>
        <h3>EduNexus AI Mentor</h3>
        <span className={styles.onlineDot}></span>
      </div>

      {/* Chat Window */}
      <div className={styles.chatWindow}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${styles.message} ${
              msg.role === "user" ? styles.userMessage : styles.aiMessage
            }`}
          >
            <p>{msg.text}</p>
            <span className={styles.time}>
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}

        {loading && (
          <div className={`${styles.message} ${styles.aiMessage}`}>
            <p>Typing...</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={styles.chatInputArea}>
        <input
          type="text"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>
          <Send size={18} />
        </button>
      </div>
    </>
  );
};

export default Chatbot;


