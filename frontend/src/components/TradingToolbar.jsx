import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import {
  ShowChart,
  Timeline,
  TrendingUp,
  CandlestickChart,
  FormatShapes,
  TextFields,
  Straighten,
  Functions,
  Settings,
  Camera,
  ZoomIn,
  ZoomOut
} from '@mui/icons-material';

export default function TradingToolbar({ onToolSelect, selectedTool }) {
  const tools = [
    { id: 'cursor', icon: <ShowChart />, label: 'Cursor' },
    { id: 'crosshair', icon: <Timeline />, label: 'Crosshair' },
    null, // divider
    { id: 'trendline', icon: <TrendingUp />, label: 'Trend Line' },
    { id: 'horizontal', icon: <Straighten sx={{ transform: 'rotate(90deg)' }} />, label: 'Horizontal Line' },
    { id: 'fibonacci', icon: <Functions />, label: 'Fibonacci Retracement' },
    null,
    { id: 'text', icon: <TextFields />, label: 'Text' },
    { id: 'shape', icon: <FormatShapes />, label: 'Shapes' },
    null,
    { id: 'measure', icon: <Straighten />, label: 'Measure' },
    { id: 'zoom', icon: <ZoomIn />, label: 'Zoom' },
  ];

  return (
    <Box sx={{ 
      width: 50,
      bgcolor: 'background.paper',
      borderRight: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      py: 1
    }}>
      {tools.map((tool, index) => {
        if (tool === null) {
          return <Divider key={`divider-${index}`} sx={{ my: 0.5 }} />;
        }
        
        return (
          <Tooltip key={tool.id} title={tool.label} placement="right">
            <IconButton
              size="small"
              onClick={() => onToolSelect(tool.id)}
              sx={{
                mx: 0.5,
                my: 0.25,
                borderRadius: 1,
                color: selectedTool === tool.id ? 'primary.main' : 'text.secondary',
                bgcolor: selectedTool === tool.id ? 'rgba(41, 182, 246, 0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: selectedTool === tool.id ? 'rgba(41, 182, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              {tool.icon}
            </IconButton>
          </Tooltip>
        );
      })}

      <Box sx={{ flex: 1 }} />

      <Tooltip title="Settings" placement="right">
        <IconButton size="small" sx={{ mx: 0.5, my: 0.25 }}>
          <Settings fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Screenshot" placement="right">
        <IconButton size="small" sx={{ mx: 0.5, my: 0.25 }}>
          <Camera fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
