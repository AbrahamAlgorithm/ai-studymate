import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    CssBaseline,
    Snackbar,
    Alert,
    IconButton,
    InputAdornment,
    Divider,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { motion } from 'framer-motion';
import { authTheme } from './shared/theme';
import LoadingButton from '@mui/lab/LoadingButton';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

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

const Signup = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const getSignupError = (code) => {
        switch (code) {
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters long.';
            case 'auth/email-already-in-use':
                return 'An account already exists with this email.';
            default:
                return 'Could not create account right now. Please try again.';
        }
    };

    const handleSignUp = async (event) => {
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
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, cleanEmail, password);
            setOpenSnackbar(true);
            setTimeout(() => navigate('/signin'), 800);
        } catch (error) {
            setError(getSignupError(error.code));
        } finally {
            setIsLoading(false);
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
                    <Typography sx={styles.title}>Create your StudyMate account</Typography>

                    <Box component="form" onSubmit={handleSignUp} noValidate>
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
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) {
                                    setError('');
                                }
                            }}
                            helperText="Use at least 6 characters"
                            FormHelperTextProps={{ sx: { color: 'rgba(250,250,250,0.55)' } }}
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
                            Create account
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
                        Continue with Google
                    </Button>

                    <Typography sx={styles.secondaryRow}>
                        Already have an account?{' '}
                        <Link to="/signin" style={styles.secondaryLink} onClick={handleSignIn}>
                            Sign in
                        </Link>
                    </Typography>
                </Box>
            </Box>

            <Snackbar
                open={openSnackbar}
                autoHideDuration={2000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" sx={{ width: '100%' }}>
                    Account created. Redirecting to sign in...
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
};

export default Signup;