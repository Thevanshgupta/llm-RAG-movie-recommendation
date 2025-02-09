import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
// console.log('LLAMA3 API URL:', process.env.REACT_APP_LLAM3_API_URL);
import LLAMA3_API_URL from './java.js';
const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [beautifiedResponse, setBeautifiedResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rawData, setRawData] = useState(null);
  const chatWindowRef = useRef(null);
  
  const handleSend = async () => {
    if (input.trim() === '') return;
  
    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);
  
    try {
      const response = await fetch('http://localhost:5000/api/vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });
  
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
  
      if (data.response_code === "200") {
        if (data.type === "count") {
          // Handle count response
          const botMessage = { 
            role: 'bot', 
            content: `There are ${data.content} movies in the database.`
          };
          setMessages(prev => [...prev, botMessage]);
        } else {
          // Handle search results
          const botMessage = { 
            role: 'bot', 
            content: 'Here are your movie recommendations:' 
          };
          setMessages(prev => [...prev, botMessage]);
          const beautified = await beautifyResponse(JSON.stringify(data.content), input);
          beautified ? setBeautifiedResponse(beautified) : setRawData(data.content);
        }
      } else {
        setBeautifiedResponse('Error: Unable to fetch data');
      }
    } catch (error) {
      console.error('Error:', error);
      setBeautifiedResponse('Error: Unable to process request');
    } finally {
      setIsLoading(false);
    }
  };
  // const LLAMA3_API_URL = process.env.REACT_APP_LLAM3_API_URL;

  const beautifyResponse = async (responseContent, userQuery) => {
    if (!LLAMA3_API_URL) {
      console.error("LLAMA3_API_URL is not defined!");
      return "Error: API endpoint not set.";
    }
  
    try {
      const prompt = `This is movie data from MongoDB. Beautify it for the user query: "${userQuery}"\nData: ${responseContent}`;
      // console.log('LLAMA3 API URL:', process.env.REACT_APP_LLAM3_API_URL);

      const response = await fetch(LLAMA3_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: userQuery }
          ],
        }),
      });
  
      if (!response.ok) {
        console.error("API request failed:", response.statusText);
        return "Error: Unable to process request.";
      }
  
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Beautification error:', error);
      return "Error: Something went wrong.";
    }
  };
  


  const renderTable = (data) => {
    if (!data || data.length === 0) return null;
  
    return (
      <div className="movie-results">
        {data.map((movie, index) => (
          <div key={index} className="movie-card">
            <h3>{movie.title}</h3>
            <p>{movie.plot}</p>
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    chatWindowRef.current?.scrollTo(0, chatWindowRef.current.scrollHeight);
  }, [messages]);

  return (
    <div className="chatbot-container">
      <div className="chat-and-data-container">
        <div className="chat-window" ref={chatWindowRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
        </div>
        <div className="right-response">
          {isLoading ? (
            <div className="loader">Searching MongoDB...</div>
          ) : (
            <>
              {beautifiedResponse && <pre>{beautifiedResponse}</pre>}
              {rawData && renderTable(rawData)}
            </>
          )}
        </div>
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about movies (e.g., 'Action movies from 2000')"
        />
        <button onClick={handleSend}>Search</button>
      </div>
    </div>
  );
};

export default Chatbot;