import { Tooltip, IconButton, Box } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';

/**
 * Educational tooltip component for explaining trading terms and features
 */
export default function InfoTooltip({ title, children, placement = 'top' }) {
  return (
    <Tooltip 
      title={title} 
      placement={placement}
      arrow
      sx={{
        '& .MuiTooltip-tooltip': {
          bgcolor: '#1f2937',
          color: '#e8e8e8',
          fontSize: '0.875rem',
          maxWidth: 300,
          border: '1px solid #00ff88',
          boxShadow: '0 4px 6px rgba(0, 255, 136, 0.2)'
        },
        '& .MuiTooltip-arrow': {
          color: '#1f2937',
          '&::before': {
            border: '1px solid #00ff88'
          }
        }
      }}
    >
      {children || (
        <IconButton size="small" sx={{ ml: 0.5, color: '#00ff88' }}>
          <InfoOutlined fontSize="small" />
        </IconButton>
      )}
    </Tooltip>
  );
}
