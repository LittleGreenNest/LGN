// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the auth context
const AuthContext = createContext();

// Authentication provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Check if user is logged in on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('sprouttieUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user data', e);
        localStorage.removeItem('sprouttieUser');
      }
    }
    setLoading(false);
  }, []);

  // Mock signup function - replace with actual API call in production
  const signup = async (email, password, name) => {
    try {
      setLoading(true);
      // This is a placeholder for your actual API call
      // In production, this would be a call to your Python backend
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For development: Create a mock user
      const newUser = {
        id: `user_${Date.now()}`,
        email,
        name,
        plan: 'free', // Default plan
        createdAt: new Date().toISOString()
      };
      
      // Store user in localStorage (temporary - will be replaced with proper session/token)
      localStorage.setItem('sprouttieUser', JSON.stringify(newUser));
      setCurrentUser(newUser);
      setError('');
      return newUser;
    } catch (err) {
      setError(err.message || 'Failed to sign up');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mock login function - replace with actual API call in production
  const login = async (email, password) => {
    try {
      setLoading(true);
      // This is a placeholder for your actual API call
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For development: Create a mock user response
      // In production, this would be the response from your backend
      const user = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0], // Simple mock name based on email
        plan: 'free',
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('sprouttieUser', JSON.stringify(user));
      setCurrentUser(user);
      setError('');
      return user;
    } catch (err) {
      setError(err.message || 'Failed to log in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Google sign in function - replace with actual implementation
  const googleSignIn = async () => {
    try {
      setLoading(true);
      // This is a placeholder for your actual Google OAuth implementation
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock Google user data
      const googleUser = {
        id: `google_user_${Date.now()}`,
        email: 'google_user@example.com',
        name: 'Google User',
        plan: 'free',
        provider: 'google',
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('sprouttieUser', JSON.stringify(googleUser));
      setCurrentUser(googleUser);
      setError('');
      return googleUser;
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('sprouttieUser');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    error,
    signup,
    login,
    googleSignIn,
    logout,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};