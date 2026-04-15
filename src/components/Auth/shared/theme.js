import { createTheme } from '@mui/material/styles';

export const authTheme = createTheme({
  typography: {
    fontFamily: '"Manrope", "Manrope Fallback", system-ui, sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#fafafa'
    },
    secondary: {
      main: '#bebebe'
    },
    background: {
      default: '#111111',
      paper: '#141414'
    },
    text: {
      primary: '#fafafa',
      secondary: '#bebebe'
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#111111',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(250, 250, 250, 0.03)',
            borderRadius: '999px',
            transition: 'all 0.2s ease',
            '& fieldset': {
              borderColor: 'rgba(250, 250, 250, 0.2)',
            },
            '&:hover': {
              '& fieldset': {
                borderColor: 'rgba(250, 250, 250, 0.45)',
              },
            },
            '&.Mui-focused': {
              '& fieldset': {
                borderColor: '#fafafa',
              },
            }
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(250, 250, 250, 0.62)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#fafafa',
          },
          '& .MuiInputBase-input': {
            color: '#fafafa',
            fontSize: '0.93rem',
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '999px',
          textTransform: 'none',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          }
        }
      }
    }
  }
});