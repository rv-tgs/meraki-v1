import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders API key gate initially', () => {
    render(<App />);
    expect(screen.getByText('Meraki API Key')).toBeInTheDocument();
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });
});
