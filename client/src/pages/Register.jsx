import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RegisterForm from '../components/auth/RegisterForm';

const Register = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const handleRegisterSuccess = () => {
    // Redirect based on user role
    navigate(isAdmin ? '/admin' : '/patient');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <RegisterForm onSuccess={handleRegisterSuccess} />
    </div>
  );
};

export default Register;