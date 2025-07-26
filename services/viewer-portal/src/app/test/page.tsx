// Create this as a TEST FILE: test-page.tsx
'use client';

export default function TestPage() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#000', minHeight: '100vh' }}>
      <h1 style={{ color: 'white', marginBottom: '20px' }}>Layout Test</h1>
      
      {/* Simple horizontal test */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#333',
        height: '200px',
        marginBottom: '20px',
        border: '2px solid red' // Red border to see the container
      }}>
        {/* Left - Image area */}
        <div style={{
          width: '300px',
          backgroundColor: 'blue',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          IMAGE AREA
        </div>
        
        {/* Right - Content area */}
        <div style={{
          flex: 1,
          backgroundColor: 'green',
          color: 'white',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2>Article Title</h2>
            <p>This is the content area. If you see this side by side with the blue IMAGE AREA, then the layout works.</p>
          </div>
          <button style={{ backgroundColor: 'purple', color: 'white', padding: '10px' }}>
            Read More
          </button>
        </div>
      </div>
      
      <p style={{ color: 'white' }}>
        If you see BLUE (IMAGE AREA) on LEFT and GREEN (content) on RIGHT, the layout works!
      </p>
    </div>
  );
}
