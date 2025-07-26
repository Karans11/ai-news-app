// Create: services/viewer-portal/src/app/debug/page.tsx
export default function DebugPage() {
  return (
    <html>
      <head>
        <title>Layout Debug</title>
      </head>
      <body style={{ margin: 0, padding: 20, backgroundColor: 'black', fontFamily: 'Arial' }}>
        <h1 style={{ color: 'white' }}>CSS Debug Test</h1>
        
        {/* Test 1: Basic Flexbox */}
        <h2 style={{ color: 'yellow' }}>Test 1: Basic Flexbox</h2>
        <div style={{
          display: 'flex',
          height: '100px',
          border: '2px solid white',
          marginBottom: '20px'
        }}>
          <div style={{ 
            width: '200px', 
            backgroundColor: 'red', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            LEFT BOX
          </div>
          <div style={{ 
            flex: 1, 
            backgroundColor: 'blue', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            RIGHT BOX (Should be next to red box)
          </div>
        </div>

        {/* Test 2: Grid Layout */}
        <h2 style={{ color: 'yellow' }}>Test 2: CSS Grid</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr',
          height: '100px',
          border: '2px solid white',
          marginBottom: '20px'
        }}>
          <div style={{ 
            backgroundColor: 'green', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            GRID LEFT
          </div>
          <div style={{ 
            backgroundColor: 'purple', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            GRID RIGHT (Should be next to green box)
          </div>
        </div>

        {/* Test 3: Float Layout (Old school) */}
        <h2 style={{ color: 'yellow' }}>Test 3: Float Layout</h2>
        <div style={{
          height: '100px',
          border: '2px solid white',
          marginBottom: '20px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            float: 'left',
            width: '200px', 
            height: '100px',
            backgroundColor: 'orange', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            FLOAT LEFT
          </div>
          <div style={{ 
            marginLeft: '200px',
            height: '100px',
            backgroundColor: 'teal', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            FLOAT RIGHT (Should be next to orange box)
          </div>
        </div>

        <div style={{ color: 'white', marginTop: '20px' }}>
          <h3>Expected Results:</h3>
          <ul>
            <li>Test 1: RED box on left, BLUE box on right</li>
            <li>Test 2: GREEN box on left, PURPLE box on right</li>
            <li>Test 3: ORANGE box on left, TEAL box on right</li>
          </ul>
          <p><strong>If ALL tests show boxes stacked vertically (on top of each other), then there&apos;s a CSS override issue.</strong></p>
          <p><strong>If ANY test shows boxes side-by-side, then that layout method works!</strong></p>
        </div>
      </body>
    </html>
  );
}
