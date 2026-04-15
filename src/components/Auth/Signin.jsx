import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    CssBaseline,
    Alert,
    IconButton,
    InputAdornment,
    Divider,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { motion } from 'framer-motion';
import { LoadingButton } from '@mui/lab';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { authTheme } from './shared/theme';

const styles = {
    pageContainer: {
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111111',
        color: '#fafafa',
        padding: '24px',
    },
    authCard: {
        width: '100%',
        maxWidth: '460px',
        padding: { xs: '4px', sm: '6px' },
    },
    title: {
        textAlign: 'center',
        fontWeight: 500,
        letterSpacing: '-0.02em',
        mb: 2.2,
        fontSize: { xs: '1.55rem', sm: '1.75rem' },
    },
    submitButton: {
        py: 1.3,
        mt: 1.5,
        backgroundColor: '#fafafa',
        color: '#101010',
        fontSize: '0.92rem',
        '&:hover': {
            backgroundColor: '#e6e6e6',
        },
    },
    dividerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        my: 3,
    },
    dividerText: {
        color: 'rgba(250,250,250,0.65)',
        fontSize: '0.82rem',
    },
    socialButton: {
        width: '100%',
        py: 1.15,
        gap: 1,
        borderRadius: '999px',
        borderColor: 'rgba(250,250,250,0.28)',
        color: '#f2f2f2',
        fontSize: '0.95rem',
        justifyContent: 'center',
        mb: 1.1,
        '&:hover': {
            borderColor: 'rgba(250,250,250,0.52)',
            backgroundColor: 'rgba(250,250,250,0.05)',
        },
    },
    secondaryRow: {
        textAlign: 'center',
        color: 'rgba(250,250,250,0.68)',
        fontSize: '0.9rem',
    },
    secondaryLink: {
        color: '#8ec7ff',
        textDecoration: 'none',
        fontWeight: 500,
    },
};

const isEmailValid = (email) => /^\S+@\S+\.\S+$/.test(email);

const Signin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

    const getSigninError = (code) => {
        switch (code) {
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'Incorrect email or password.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please wait a moment and try again.';
            default:
                return 'Could not sign in right now. Please try again.';
        }
    };

    const handleSignIn = async (event) => {
        event.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (!isEmailValid(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

        setIsLoading(true);
        try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
            navigate('/chat');
        } catch (error) {
      setError(getSigninError(error.code));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = () => {
      navigate('/signup');
    };

    return (
        <ThemeProvider theme={authTheme}>
            <CssBaseline />
            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                sx={styles.pageContainer}
            >
                <Box
                    component={motion.div}
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.35 }}
                    sx={styles.authCard}
                >
                    <Typography sx={styles.title}>Welcome back to StudyMate</Typography>

                    <Box component="form" onSubmit={handleSignIn} noValidate>
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) {
                                    setError('');
                                }
                            }}
                        />

                        <TextField
                            margin="normal"
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) {
                                    setError('');
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 1.5 }}>
                                {error}
                            </Alert>
                        )}

                        <LoadingButton
                            sx={styles.submitButton}
                            fullWidth
                            variant="contained"
                            loading={isLoading}
                            type="submit"
                            disabled={!email.trim() || !password}
                        >
                            Sign in
                        </LoadingButton>
                    </Box>

                    <Box sx={styles.dividerRow}>
                        <Divider sx={{ flex: 1, borderColor: 'rgba(250,250,250,0.2)' }} />
                        <Typography sx={styles.dividerText}>or</Typography>
                        <Divider sx={{ flex: 1, borderColor: 'rgba(250,250,250,0.2)' }} />
                    </Box>

                    <Button variant="outlined" sx={styles.socialButton}>
                        <Box
                            component="img"
                            src="https://res.cloudinary.com/subframe/image/upload/v1711417516/shared/z0i3zyjjqkobzuaecgno.svg"
                            alt="Google"
                            sx={{ width: 18, height: 18 }}
                        />
                        Log in with Google
                    </Button>

                    <Typography sx={styles.secondaryRow}>
                        New to StudyMate?{' '}
                        <Link to="/signup" style={styles.secondaryLink} onClick={handleSignUp}>
                            Sign up
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export default Signin;