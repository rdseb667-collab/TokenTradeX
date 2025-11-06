import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff88',         // Bright green for buy/positive
      light: '#33ffaa',
      dark: '#00cc6a'
    },
    secondary: {
      main: '#ff3366',         // Bright red for sell/negative  
      light: '#ff6688',
      dark: '#cc0033'
    },
    background: {
      default: '#0a0e14',      // Very dark blue-black
      paper: '#0f1419'         // Slightly lighter for cards
    },
    success: {
      main: '#00ff88',
      light: '#33ffaa',
      dark: '#00cc6a'
    },
    error: {
      main: '#ff3366',
      light: '#ff6688',
      dark: '#cc0033'
    },
    warning: {
      main: '#ffaa00',         // Bright orange
      light: '#ffcc33',
      dark: '#cc8800'
    },
    info: {
      main: '#00aaff',         // Bright blue
      light: '#33bbff',
      dark: '#0088cc'
    },
    text: {
      primary: '#e8e8e8',      // Almost white
      secondary: '#9ca3af'     // Light gray
    },
    divider: '#1f2937'         // Dark gray borders
  },
  typography: {
    fontFamily: '"Roboto Mono", "Courier New", monospace',  // Monospace for trading data
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontWeight: 600
    },
    h4: {
      fontWeight: 700
    },
    h6: {
      fontWeight: 600
    },
    body1: {
      fontSize: '0.9375rem'
    },
    body2: {
      fontSize: '0.875rem'
    },
    button: {
      textTransform: 'none',   // No uppercase buttons
      fontWeight: 700,
      fontSize: '0.9375rem'
    }
  },
  shape: {
    borderRadius: 0            // Sharp corners everywhere
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,        // Sharp corners
          padding: '10px 24px',
          boxShadow: 'none',
          border: '2px solid transparent',
          transition: 'all 0.15s ease',
          '&:hover': {
            boxShadow: 'none',
            transform: 'translateY(-1px)'
          }
        },
        contained: {
          '&:hover': {
            boxShadow: 'none'
          }
        },
        containedPrimary: {
          backgroundColor: '#00ff88',
          color: '#000',
          '&:hover': {
            backgroundColor: '#00cc6a'
          }
        },
        containedSecondary: {
          backgroundColor: '#ff3366',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#cc0033'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 0,
          border: '1px solid #1f2937'
        },
        elevation1: {
          boxShadow: 'none'
        },
        elevation2: {
          boxShadow: 'none'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 0,
          border: '1px solid #1f2937'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            backgroundColor: '#0a0e14',
            '& fieldset': {
              borderColor: '#1f2937',
              borderWidth: '2px'
            },
            '&:hover fieldset': {
              borderColor: '#374151'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00ff88',
              borderWidth: '2px'
            }
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          backgroundColor: '#0a0e14',
          borderRadius: 0
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontWeight: 600
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #1f2937',
          padding: '12px 16px'
        },
        head: {
          backgroundColor: '#0a0e14',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '11px',
          letterSpacing: '0.05em',
          color: '#9ca3af'
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          minHeight: 48,
          fontWeight: 600,
          '&.Mui-selected': {
            color: '#00ff88'
          }
        }
      }
    }
  }
});

export default theme;
