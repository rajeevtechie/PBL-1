import { Joyride } from 'react-joyride'; // 🛡️ Removed STATUS import to prevent Vite crashes

const TourGuide = ({ steps, run, onComplete }) => {
  // If your automated testing bot is running, it skips the tour completely.
  if (import.meta.env.VITE_DISABLE_TOURS === 'true') {
    return null; 
  }

  const handleCallback = (data) => {
    const { status, action } = data;

    // 🛡️ THE FIX: Use raw strings instead of the STATUS object.
    // ALSO: Catch action === 'close' so clicking the dark overlay properly saves the completion!
    if (status === 'finished' || status === 'skipped' || action === 'close') {
      onComplete(); 
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      disableOverlayClose={false} 
      disableScrollParentFix={true}
      callback={handleCallback}
      styles={{
        options: { 
          arrowColor: '#1e293b', 
          backgroundColor: '#1e293b', 
          overlayColor: 'rgba(15, 23, 42, 0.75)', 
          primaryColor: '#6366f1', 
          textColor: '#f8fafc', 
          zIndex: 10000 
        },
        buttonNext: { 
          backgroundColor: '#6366f1', 
          borderRadius: '8px', 
          fontSize: '0.9rem', 
          padding: '8px 16px',
          color: '#ffffff',
          border: 'none',
          outline: 'none',
          cursor: 'pointer'
        },
        buttonBack: { 
          color: '#cbd5e1', 
          marginRight: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer'
        },
        buttonSkip: { 
          color: '#64748b',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer'
        }
      }}
    />
  );
};

export default TourGuide;