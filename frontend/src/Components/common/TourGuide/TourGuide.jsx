import React from 'react';
import { Joyride, STATUS } from 'react-joyride';

const TourGuide = ({ steps, run, onComplete }) => {
  const handleCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      onComplete(); // Tells the parent page to save to localStorage
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      disableScrollParentFix={true} /* Fixes positioning glitches */
      callback={handleCallback}
      styles={{
        options: {
          arrowColor: '#1e293b', 
          backgroundColor: '#1e293b',
          overlayColor: 'rgba(15, 23, 42, 0.85)',
          primaryColor: '#6366f1',
          textColor: '#f8fafc',
          zIndex: 1000,
        },
        tooltip: {
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          border: '1px solid #334155',
          color: '#f8fafc',           
          padding: '20px'
        },
        tooltipContainer: {
          textAlign: 'left'
        },
        buttonNext: {
          backgroundColor: '#6366f1',
          borderRadius: '8px',
          color: '#ffffff',
          fontWeight: '600',
          padding: '8px 16px',
          border: 'none',
          outline: 'none'
        },
        buttonBack: {
          color: '#cbd5e1',
          marginRight: '10px'
        },
        buttonSkip: {
          color: '#64748b'
        },
        beacon: {
          display: 'none' /* Hides the glitchy black circle */
        }
      }}
    />
  );
};

export default TourGuide;