import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

const GlobalStyles = () => (
  <MuiGlobalStyles
    styles={{
      body: {
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      },
      '#root': {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      },
    }}
  />
);

export default GlobalStyles;
