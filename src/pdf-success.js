// src/pages/pdf-success.js
import React from 'react';
import { Link } from 'react-router-dom';


const PDFSuccessPage = () => {
  return (
    <div className="success-container">
      <div className="success-card">
        <h1>✨ You’re In! ✨</h1>
        <p>Thanks for subscribing to the PDF Plan on Sprouttie! 🧠📄</p>
        <p className="subtext">Your PDF Plan is activated. Ready to print flashcards that spark your little one's curiosity? ✨
</p>
        <Link to="/flashcards">
          <button className="success-btn">Start Exploring</button>
        </Link>
      </div>
    </div>
  );
};

export default PDFSuccessPage;
