import React from 'react';
import './Auth.css';

const Signup = () => {
    return (
        <div className="auth-container">
            <div className="auth-form">
                <h2>Sign Up</h2>
                <form>
                    <input type="text" placeholder="Full Name" required />
                    <input type="email" placeholder="Email" required />
                    <input type="password" placeholder="Password" required />
                    <button type="submit">Sign Up</button>
                </form>
                <p>Already have an account? <a href="/signin">Sign In</a></p>
            </div>
        </div>
    );
}

export default Signup;
