import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, TextField, CssBaseline, Stack } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const themePrimary = createTheme({
    typography: {
        fontFamily: 'Georgia, serif', 
    },
    palette: {
        mode: 'dark',
        primary: {
            main: '#5d9cec', 
        },
        secondary: {
            main: '#f7a7a7', 
        },
        background: {
            default: '#1f1f1f', 
            paper: '#1f1f1f', 
        },
        text: {
            primary: '#ffffff', 
            secondary: '#cccccc',
        },
        myblue: {
            main: '#00fffb',
        },
    },
});

const Signin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSignIn = (event) => {
        event.preventDefault();

        // Simulate sign-in logic (replace with real logic later)
        const existingUser = 'test@example.com';
        const correctPassword = 'password123';

        if (email === existingUser && password === correctPassword) {
            navigate('/');  // Redirect to home page after successful sign-in
        } else {
            setError('Incorrect email or password.');
        }
    };

    const handleSignUp = () => {
        navigate('/signup');
    };

    return (
        <ThemeProvider theme={themePrimary}>
            <CssBaseline />
            <Container maxWidth="xs">
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight="80vh"
                    textAlign="center"
                >
                    <Stack 
                        direction="row" 
                        spacing={2} 
                        alignItems="center" 
                        width="auto" 
                        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 5 }} 
                    >
                        <Typography variant="h4" color="inherit" fontWeight={'bold'}>
                            AI<span style={{ color: "#00fffb" }}>-StudyMate</span>
                        </Typography>
                    </Stack>

                    <Box
                        component="form"
                        onSubmit={handleSignIn}
                        noValidate
                        sx={{
                            padding: '40px',
                            borderRadius: '12px',
                            boxShadow: '0 12px 24px rgba(0,0,0,0.8)',
                            width: '100%',
                            maxWidth: '400px',
                            mt: 5,
                        }}
                    >
                        <Typography variant="h4" component="h1" gutterBottom>
                            Sign In
                        </Typography>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            variant="outlined"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && <Typography color="error">{error}</Typography>}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="white"
                            sx={{ mt: 3, mb: 2, color: 'black' }}
                        >
                            Sign In
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            color="myblue"
                            onClick={handleSignUp}
                        >
                            Don&apos;t have an account? Sign Up
                        </Button>
                    </Box>
                </Box>
            </Container>
        </ThemeProvider>
    );
};

export default Signin;
