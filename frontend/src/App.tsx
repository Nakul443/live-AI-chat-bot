// manages visual state, user input and core flow of the app

import { useState, useEffect, useRef } from "react";
import {
  sendMessageAPI,
  getChatHistoryAPI,
  type Message,
} from "./services/api";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // tracks whether the left sidebar drawer layout is expanded or collapsed
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on page refresh
  useEffect(() => {
    const savedSessionId = localStorage.getItem("chat_session_id");
    if (savedSessionId) {
      setIsLoading(true);
      getChatHistoryAPI(savedSessionId)
        .then((data) => {
          if (data.success && data.messages) {
            setMessages(data.messages);
          }
        })
        .catch((err) => {
          console.error("Failed to load chat history:", err);
          localStorage.removeItem("chat_session_id");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  // Always scroll to the latest message instantly
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guardrail: Don't accept empty/whitespace messages or handle twin clicks while loading
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    setErrorMessage(null);

    // Show the user's message immediately on screen
    const tempUserMsg: Message = {
      chatId: Number(localStorage.getItem("chat_session_id")) || 0,
      content: userText,
      sender: "USER",
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const savedSessionId = localStorage.getItem("chat_session_id");
      const data = await sendMessageAPI(userText, savedSessionId);

      // Save the conversation ID back to storage if it's a new chat
      if (!savedSessionId && data.sessionId) {
        localStorage.setItem("chat_session_id", data.sessionId);
      }

      // Display the AI response
      const aiReplyMsg: Message = {
        chatId: Number(data.sessionId),
        content: data.reply,
        sender: "AI",
      };
      setMessages((prev) => [...prev, aiReplyMsg]);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setErrorMessage(
        err.response?.data?.error ||
          "Could not reach the support agent. Please check your server connection.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    localStorage.removeItem("chat_session_id");
    setMessages([]);
    setErrorMessage(null);
  };

  return (
    <div className="gemini-app-frame">
      {/* left sidebar */}
      <aside
        className={`gemini-sidebar ${sidebarOpen ? "expanded" : "collapsed"}`}
      >
        <div className="sidebar-top">
          {/* Action button to wipe session keys and clear screen instantly */}
          <button className="new-chat-btn" onClick={handleResetChat}>
            <span className="plus-icon">+</span>
            {sidebarOpen && <span>New chat</span>}
          </button>
        </div>

        {/* Only show recent conversation tabs if the user hasn't closed the sidebar menu */}
        {sidebarOpen && (
          <div className="recent-history-container">
            <p className="recent-label">Recent Conversations</p>
            {messages.length > 0 && (
              <div className="history-tab active">
                <svg
                  viewBox="0 0 24 24"
                  className="chat-tab-icon"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="truncate-text">Current Session</span>
              </div>
            )}
          </div>
        )}
      </aside>

      <main className="gemini-workspace">
        {/* Workspace Top Header Strip */}
        <header className="workspace-top-bar">
          {/* Menu bars button that triggers sidebar toggle visibility state */}
          <button
            className="toggle-sidebar-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="brand-title">Workspace AI</div>
        </header>

        {/* Scrollable Message Thread Feed Container */}
        <div className="workspace-scroll-body">
          {messages.length === 0 && !isLoading ? (
            <div className="gemini-welcome-canvas">
              <h1 className="gradient-header-text">Hello!</h1>
            </div>
          ) : (
            /* Chat Stream Wrapper */
            <div className="message-thread-wrapper">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`gemini-msg-row ${msg.sender.toLowerCase()}`}
                >
                  <div className="avatar-column">
                    {msg.sender === "USER" ? (
                      <div className="user-initials-avatar">U</div>
                    ) : (
                      <div className="ai-spark-avatar">✨</div>
                    )}
                  </div>
                  <div className="content-column">
                    <span className="sender-tag">
                      {msg.sender === "USER" ? "You" : "AI"}
                    </span>
                    <div className="markdown-content-render">
                      <p>{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Real-time Loading UI Block */}
              {isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1].sender === "USER" && (
                  <div className="gemini-msg-row ai generating-state">
                    <div className="avatar-column">
                      <div className="ai-spark-avatar loading-pulse">✨</div>
                    </div>
                    <div className="content-column">
                      <span className="sender-tag">AI Support</span>
                      <div className="gemini-loading-skeleton">
                        <div className="skeleton-bar line-1"></div>
                        <div className="skeleton-bar line-2"></div>
                      </div>
                    </div>
                  </div>
                )}

              {/* error alert display */}
              {errorMessage && (
                <div className="workspace-error-alert-box">
                  <p>⚠️ {errorMessage}</p>
                </div>
              )}

              {/* layout element for smooth auto-scroll hooks */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Bottom Prompt Input Form Container */}
        <footer className="workspace-bottom-footer">
          <form
            className="gemini-prompt-input-form"
            onSubmit={handleSendMessage}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask AI"
              disabled={isLoading}
              maxLength={4000}
            />
            <button
              type="submit"
              className="prompt-send-action"
              disabled={isLoading || !inputMessage.trim()}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
          <div className="disclaimer-note">
            AI can make mistakes. Always verify information.
          </div>
        </footer>
      </main>
    </div>
  );
}
