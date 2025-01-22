import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Box, Button, Container, Typography, TextField, CssBaseline, Stack, Alert } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { motion } from 'framer-motion';
import { LoadingButton } from '@mui/lab';

const styles = {
  pageContainer: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)',
    position: 'relative',
    padding: '20px',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at top right, rgba(75, 144, 255, 0.1), transparent 50%)',
      pointerEvents: 'none'
    }
  },
  formContainer: {
    width: '100%',
    maxWidth: '450px',
    padding: '40px',
    borderRadius: '20px',
    backgroundColor: 'rgba(31, 31, 31, 0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(75, 144, 255, 0.1)',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.3)',
    position: 'relative',
    pb: '80px'
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      '&:hover, &.Mui-focused': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        '& fieldset': {
          borderColor: '#4b90ff'
        }
      }
    }
  },
  submitButton: {
    height: '50px',
    background: 'linear-gradient(45deg, #4b90ff 0%, #6ba5ff 100%)',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    textTransform: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(75, 144, 255, 0.3)'
    }
  },
  signUpLink: {
    position: 'absolute',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff',
    textAlign: 'center',
    '& .MuiButton-root': {
      color: '#4b90ff',
      fontSize: '14px',
      textTransform: 'none',
      '&:hover': {
        background: 'rgba(75, 144, 255, 0.1)'
      }
    }
  },
  welcomeText: {
    variant: "body1",
    align: "center",
    sx: { 
      mb: 4, 
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '1rem'
    }
  }
};

const authTheme = createTheme({
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#4b90ff'
    },
    background: {
      default: '#1f1f1f',
      paper: '#1f1f1f'
    }
  }
});

const Signin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);  // Sign in with auth
            navigate('/chat');
        } catch (error) {
            let errorMessage = 'An error occurred. Please try again.';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No user found with this email.';
                    break;
                default:
                    errorMessage = 'Failed to sign in. Please check your credentials and try again.';
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = () => {
        navigate('/');
    };

    return (
        <ThemeProvider theme={authTheme}>
            <CssBaseline />
            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                sx={styles.pageContainer}
            >
                <Box
                    component={motion.div}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    sx={styles.formContainer}
                >
                    <Typography
                        variant="h4"
                        align="center"
                        sx={{
                            mb: 1,
                            background: 'linear-gradient(45deg, #fff, #4b90ff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        AI-StudyMate
                    </Typography>

                    <Typography 
                      variant="body1" 
                      align="center" 
                      sx={{ 
                        mb: 4, 
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '1rem'
                      }}
                    >
                      To get started, sign in to your account.
                    </Typography>
                    
                    <TextField
                        margin="normal"
                        fullWidth
                        label="Email"
                        autoComplete="email"
                        sx={styles.textField}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    
                    <TextField
                        margin="normal"
                        fullWidth
                        label="Password"
                        type="password"
                        sx={styles.textField}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && (
                        <Alert
                            severity="error"
                            sx={{
                                mt: 2,
                                bgcolor: 'rgba(255, 76, 76, 0.1',
                                border: '1px solid rgba(255, 76, 76, 0.2)'
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    <LoadingButton
                        sx={styles.submitButton}
                        fullWidth
                        variant="contained"
                        loading={isLoading}
                        onClick={handleSignIn}
                        mt={3}
                    >
                        Sign In
                    </LoadingButton>
                </Box>
                
                <Box sx={styles.signUpLink}>
                    <Typography variant='body2' color="textSecondary" mb={1}>
                        Don't have an account?
                    </Typography>
                    <Button
                        variant="text"
                        onClick={handleSignUp}
                        endIcon={
                            <motion.div 
                                whileHover={{ x: 5 }} 
                                transition={{ duration: 0.2 }}
                            >
                                →
                            </motion.div>
                        }
                        sx={{
                            color: '#4b90ff',
                            fontSize: '14px',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'rgba(75, 144, 255, 0.1)'
                            }
                        }}
                    >
                        Sign Up
                    </Button>


                </Box>
            </Box>

            
        </ThemeProvider>
    );
};

export default Signin;