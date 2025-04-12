import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

function NurseBot() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [indexData, setIndexData] = useState(null);
  const [debug, setDebug] = useState("");
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom when new messages appear
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    console.log(selectedFile);
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }
    setFile(selectedFile);
    setIndexData(null);
    setChatHistory([]);
  };

  const logDebug = (message, data) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    const formattedData = typeof data === 'object' ? 
      (data instanceof Error ? data.toString() : 
       JSON.stringify(data, (key, value) => {
         // Handle large strings for index data by truncating
         if (typeof value === 'string' && value.length > 500) {
           return value.substring(0, 100) + `... [${value.length} chars]`;
         }
         return value;
       }, 2)) : 
      String(data);
    
    setDebug(prev => `${prev}\n[${timestamp}] ${message}\n${formattedData}\n-------------------`);
    console.log(message, data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !question) return;

    // Store current question and clear input
    const currentQuestion = question;
    setQuestion("");
    
    // Add question to chat history
    setChatHistory(prev => [...prev, { type: "question", content: currentQuestion }]);
    
    setIsLoading(true);

    try {
      // Step 1: Upload file if it hasn't been uploaded yet
      if (!indexData) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        logDebug("Uploading file:", file.name);
        
        try {
          const uploadRes = await axios.post("http://localhost:5000/upload_to_nurse", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          console.log(uploadRes);
          logDebug("Upload Response status:", uploadRes.status);

          if (!uploadRes.data || 
            uploadRes.data.index_length === undefined || 
            uploadRes.data.chunks_count === undefined || 
            uploadRes.data.embeddings_length === undefined || 
            uploadRes.data.embedding_shape === undefined) {
            console.error("Document processing failed: Invalid data received", uploadRes.data);
            throw new Error("Document processing failed: Invalid data received");
          }
          
          console.log("hello");
          console.log(uploadRes.data.index_length);
          console.log(uploadRes.data.chunks);
          console.log(uploadRes.data.embeddings);
          
          // Store the index data first before proceeding
          const newIndexData = {
            index: uploadRes.data.index_length,
            chunks: uploadRes.data.chunks,
            embeddings: uploadRes.data.embeddings,
            embedding_shape: uploadRes.data.embedding_shape
          };
          
          console.log("helpp");
          
          console.log(newIndexData);
          setIndexData(newIndexData);
          
          console.log("ramya");
          // Ask the question with the newly received index data
          logDebug("Sending question with index data", { 
            query: currentQuestion,
            index_preview: newIndexData.index,
            chunks_count: newIndexData.chunks.length,
            embedding_shape: newIndexData.embedding_shape
          });
          
          const askRes = await axios.post(
            "http://localhost:5000/ask",
            {
              query: currentQuestion,
              index: newIndexData.index,
              chunks: newIndexData.chunks,
              embeddings: newIndexData.embeddings,
              embedding_shape: newIndexData.embedding_shape
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          
          logDebug("Ask Response:", {
            status: askRes.status,
            data: askRes.data
          });
          
          // Add response to chat history
          setChatHistory(prev => [...prev, { 
            type: "answer", 
            content: askRes.data.answer || "No answer found" 
          }]);
          
        } catch (err) {
          logDebug("Upload/Ask Error:", err.toString());
          
          if (err.response) {
            logDebug("Error Response:", {
              status: err.response.status,
              data: err.response.data
            });
          }
          
          // Add error to chat history
          setChatHistory(prev => [...prev, { 
            type: "error", 
            content: `Error: ${err.message}` 
          }]);
        } finally {
          setIsUploading(false);
        }
      } else {
        // If we already have index data, just ask the question
        logDebug("Sending question with existing index data", { 
          query: currentQuestion,
          index_preview: indexData.index,
          chunks_count: indexData.chunks.length,
          embedding_shape: indexData.embedding_shape
        });
        
        try {
          const askRes = await axios.post(
            "http://localhost:5000/ask",
            {
              query: currentQuestion,
              index: indexData.index,
              chunks: indexData.chunks,
              embeddings: indexData.embeddings,
              embedding_shape: indexData.embedding_shape
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          
          logDebug("Ask Response:", {
            status: askRes.status,
            data: askRes.data
          });
          
          // Add response to chat history
          setChatHistory(prev => [...prev, { 
            type: "answer", 
            content: askRes.data.answer || "No answer found" 
          }]);
        } catch (err) {
          logDebug("Ask Error:", err.toString());
          
          if (err.response) {
            logDebug("Error Response:", {
              status: err.response.status,
              data: err.response.data
            });
          }
          
          // Add error to chat history
          setChatHistory(prev => [...prev, { 
            type: "error", 
            content: `Error: ${err.message}` 
          }]);
        }
      }
    } catch (err) {
      logDebug("General Error:", err.toString());
      
      // Add error to chat history
      setChatHistory(prev => [...prev, { 
        type: "error", 
        content: `Error: ${err.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: { maxWidth: "600px", margin: "0 auto", fontFamily: "Arial, sans-serif" },
    title: { color: "#333", marginBottom: "20px" , fontSize:"40px"},
    inputLabel: { display: "block", marginBottom: "8px", fontWeight: "bold" },
    fileInput: { padding: "8px", marginBottom: "15px" },
    textarea: { 
      width: "100%", padding: "10px", fontSize: "16px", 
      border: "1px solid #ddd", borderRadius: "4px", marginBottom: "10px" 
    },
    button: {
      backgroundColor: "#4CAF50", color: "white", padding: "10px 15px",
      border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "16px"
    },
    chatBox: {
      height: "300px",
      overflowY: "auto",
      padding: "15px", 
      backgroundColor: "#f8f9fa",
      border: "1px solid #ddd", 
      borderRadius: "4px", 
      marginBottom: "15px"
    },
    questionBubble: {
      backgroundColor: "#e3f2fd",
      borderRadius: "18px 18px 0 18px",
      padding: "8px 12px",
      marginBottom: "10px",
      maxWidth: "80%",
      marginLeft: "auto",
      textAlign: "right"
    },
    answerBubble: {
      backgroundColor: "#f1f8e9",
      borderRadius: "18px 18px 18px 0",
      padding: "8px 12px",
      marginBottom: "10px",
      maxWidth: "80%"
    },
    errorBubble: {
      backgroundColor: "#ffebee",
      borderRadius: "18px 18px 18px 0",
      padding: "8px 12px",
      marginBottom: "10px",
      maxWidth: "80%",
      color: "#c62828"
    },
    debugBox: {
      padding: "15px", backgroundColor: "#f5f5f5",
      border: "1px solid #ccc", borderRadius: "4px", marginTop: "20px",
      fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap",
      maxHeight: "300px", overflow: "auto"
    },
    clearBtn: {
      backgroundColor: "#ddd", 
      border: "none", 
      padding: "5px 10px", 
      borderRadius: "4px", 
      cursor: "pointer",
      marginBottom: "5px"
    },
    fileStatus: {
      marginBottom: "10px",
      padding: "5px 10px",
      backgroundColor: indexData ? "#e8f5e9" : "#f5f5f5",
      borderRadius: "4px",
      display: "inline-block",
      fontSize: "14px"
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📄 Document QA System </h1>
      
      <div>
        <label style={styles.inputLabel}>
          Upload Document (PDF, DOCX, TXT, PPTX, XLSX, max 10MB):
        </label>
        <input 
          type="file" 
          onChange={handleFileUpload}
          accept=".pdf,.docx,.txt,.pptx,.xlsx"
          style={styles.fileInput}
        />
        {file && (
          <div style={styles.fileStatus}>
            {indexData ? '✅ Document processed' : '📄'} {file.name}
          </div>
        )}
      </div>
      
      <div style={styles.chatBox}>
        {chatHistory.length === 0 ? (
          <div style={{textAlign: "center", color: "#888", marginTop: "120px"}}>
            Upload a document and ask questions to start chatting
          </div>
        ) : (
          chatHistory.map((item, index) => (
            <div 
              key={index} 
              style={
                item.type === "question" ? styles.questionBubble : 
                item.type === "error" ? styles.errorBubble : 
                styles.answerBubble
              }
            >
              <div style={{whiteSpace: "pre-wrap"}}>{item.content}</div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      
      <form onSubmit={handleSubmit}>
        <label style={styles.inputLabel}>
          Ask a question about the document:
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question here..."
          rows="3"
          style={styles.textarea}
          disabled={isUploading}
        />
        
        <button
          type="submit"
          disabled={!file || !question || isLoading || isUploading}
          style={{
            ...styles.button,
            opacity: (!file || !question || isLoading || isUploading) ? 0.6 : 1
          }}
        >
          {isUploading ? "Uploading..." : isLoading ? "Processing..." : "Ask Question"}
        </button>
      </form>
      
      <div style={styles.debugBox}>
        <h3>Debug Log</h3>
        <button 
          style={styles.clearBtn} 
          onClick={() => setDebug("")}
        >
          Clear Log
        </button>
        {debug || "No debug information yet."}
      </div>
    </div>
  );
};

export default NurseBot;