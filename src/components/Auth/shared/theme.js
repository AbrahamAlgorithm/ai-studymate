import { createTheme } from '@mui/material/styles';

export const authTheme = createTheme({
  typography: {
    fontFamily: '"Manrope", "Manrope Fallback", system-ui, sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    h4: {
      fontWeight: 500,
      color: '#c4c7c5'
    }
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#4b90ff'
    },
    secondary: {
      main: '#585858'
    },
    background: {
      default: '#1f1f1f',
      paper: 'rgba(31, 31, 31, 0.8)'
    }
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              '& fieldset': {
                borderColor: '#64FFDA',
              },
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }
        }
      }
    }
  }
});