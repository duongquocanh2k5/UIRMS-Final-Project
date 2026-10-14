/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0A9E96',
                    light: '#EDFBF9',
                },
                danger: '#C0392B',
                warning: '#E67E22',
                success: '#27AE60',
                info: '#2E86DE',
                'neutral-900': '#1D2D39',
                'neutral-500': '#7A8997',
                background: '#F5F8FA',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
