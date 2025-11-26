import React, { useState } from 'react';
import { userAPI } from '../../client/src/services/api';

function UserForm({ onUserCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await userAPI.createUser(formData);
      setSuccess(true);
      setError(null);
      setFormData({ name: '', email: '', password: '', role: 'employee' });
      
      if (onUserCreated) {
        onUserCreated();
      }
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to create user');
      setSuccess(false);
      console.error('Error creating user:', err);
    }
  };

  return (
    <div className="user-form">
      <h2>Create New User</h2>
      {success && <div className="success">User created successfully!</div>}
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Role:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <button type="submit">Create User</button>
      </form>
    </div>
  );
}

export default UserForm;
