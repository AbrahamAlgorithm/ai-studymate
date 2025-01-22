import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Box, Button, Container, Typography, TextField, CssBaseline, Stack, Snackbar, Alert } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createUserWithEmailAndPassword } from 'firebase/auth'; 
import { auth } from '../../firebase';
import { motion } from 'framer-motion';
import { authTheme } from './shared/theme';
import LoadingButton from '@mui/lab/LoadingButton';

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
  signInLink: {
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

  imageContainer: {
    flex: 1,
    display: { xs: 'none', md: 'flex' },
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(31, 31, 31, 0.7), rgba(31, 31, 31, 0.3))',
      zIndex: 1
    }
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.9
  },
  imageOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
    textAlign: 'center',
    width: '100%',
    padding: '0 2rem'
  }
};

const Signup = () => {
    const navigate = useNavigate(); // React Router's useNavigate
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async (event) => {
        event.preventDefault();
        if (password.length <= 5) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert('Account created! Please sign in.');
            navigate('/signin'); // Redirect to sign-in page
        } catch (error) {
            let errorMessage = 'An error occurred. Please try again.';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Please choose a stronger password.';
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = 'An account already exists with this email address.';
                    break;
                default:
                    errorMessage = 'Failed to sign up. Please check your details and try again.';
            }
            setError(errorMessage);
        }
    };

    const handleSignIn = () => {
        navigate('/signin');
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
                    
                    {/* a paragraph that say "SignUp to get started" */}
                    <Typography 
                        variant="body1" 
                        align="center" 
                        sx={{ 
                            mb: 4, 
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '1rem'
                        }}
                    >
                        Sign Up to get started
                    </Typography>

                    <TextField
                        sx={styles.textField}
                        margin="normal"
                        fullWidth
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    
                    <TextField
                        sx={styles.textField}
                        margin="normal"
                        fullWidth
                        type="password"
                        label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ 
                                mt: 2,
                                bgcolor: 'rgba(255, 76, 76, 0.1)',
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
                        onClick={handleSignUp}
                        mt={3}
                    >
                        Sign Up
                    </LoadingButton>
                </Box>

                <Box sx={styles.signInLink}>
                    <Typography variant="body2" color="textSecondary" mb={1}>
                        Already have an account?
                    </Typography>
                    <Button
                        variant="text"
                        onClick={handleSignIn}
                        endIcon={<motion.div whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>→</motion.div>}
                    >
                        Sign In
                    </Button>
                </Box>
            </Box>

            {/* Snackbar for success message */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={2000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" sx={{ width: '100%' }}>
                    Account created successfully! Please sign in.
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
};

export default Signup;