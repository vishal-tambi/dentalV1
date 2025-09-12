import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';

const Login = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const handleLoginSuccess = () => {
    // Redirect based on user role
    navigate(isAdmin ? '/admin' : '/patient');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
};

export default Login;