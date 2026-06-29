import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import axios from 'axios';

// Mock axios so we don't actually hit the backend
jest.mock('axios');

// Mock UploadZone since it's a separate component. 
// We just want to test Dashboard's state handling and API resilience.
jest.mock('../../components/UploadZone', () => {
  return function MockUploadZone({ onUpload, loading }) {
    return (
      <div data-testid="upload-zone">
        <button 
          onClick={() => onUpload(new File(['dummy'], 'test.pdf', { type: 'application/pdf' }))}
          disabled={loading}
          data-testid="upload-button"
        >
          {loading ? 'Processing...' : 'Upload & Analyze'}
        </button>
      </div>
    );
  };
});

describe('Dashboard Component - Staff Engineer Review', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('prevents multiple submissions when the user spams the upload button 15 times', async () => {
        /*
         * Test where the user clicks the 'Upload & Analyze' button 15 times in 2 seconds. 
         * Ensure the UI disables the button and only sends one Axios request.
         */
        
        // Mock a delayed response so the button stays in a "loading" state
        axios.post.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ 
                data: { fraud_score: 95.0, status: "verified", flags: [] } 
            }), 1000))
        );

        render(<Dashboard />);

        const uploadButton = screen.getByTestId('upload-button');

        // User spams the button 15 times like a maniac
        for (let i = 0; i < 15; i++) {
            fireEvent.click(uploadButton);
        }

        // Wait for the dust to settle
        await waitFor(() => {
            // It better have only been called ONCE. 
            // If it's called 15 times, you have a race condition and a disabled state bug.
            expect(axios.post).toHaveBeenCalledTimes(1);
        });
        
        // The button should be disabled while loading
        expect(uploadButton).toBeDisabled();
    });

    it('handles a 500 Internal Server Error gracefully without white-screening', async () => {
        /*
         * Mock a 500 Internal Server Error from the backend. 
         * Ensure the frontend catches it and displays a clean error boundary or toast notification, 
         * rather than a blank white screen.
         */
        
        // The backend died. Typical.
        // Dashboard is designed to throw an error to the ErrorBoundary on >= 500
        axios.post.mockRejectedValue({
            response: {
                status: 500,
                data: { detail: "Internal Server Error" }
            }
        });

        // Hide console.error because React will log the ErrorBoundary catch, and I don't want noisy test logs.
        const originalError = console.error;
        console.error = jest.fn();

        render(<Dashboard />);

        const uploadButton = screen.getByTestId('upload-button');
        
        fireEvent.click(uploadButton);

        // We wait for the ErrorBoundary to render the "System Failure" screen.
        await waitFor(() => {
            const errorMessage = screen.getByText(/System Failure/i);
            expect(errorMessage).toBeInTheDocument();
        });
        
        expect(screen.getByText(/Catastrophic Error Detected/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reboot Interface/i })).toBeInTheDocument();

        // Restore console.error
        console.error = originalError;
    });
});
