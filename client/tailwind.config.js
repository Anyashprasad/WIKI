export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                border: "var(--border)",
                input: "var(--input)",
                ring: "var(--ring)",
                chart: {
                    "1": "var(--chart-1)",
                    "2": "var(--chart-2)",
                    "3": "var(--chart-3)",
                    "4": "var(--chart-4)",
                    "5": "var(--chart-5)",
                },
                "dark-bg": "var(--dark-bg)",
                "card-bg": "var(--card-bg)",
                "border-dark": "var(--border-dark)",
                "hacker-green": "var(--hacker-green)",
                "terminal-green": "var(--terminal-green)",
            },
            fontFamily: {
                sans: ["var(--font-sans)"],
                mono: ["var(--font-mono)"],
            },
            keyframes: {
                "accordion-down": {
                    from: {
                        height: "0",
                    },
                    to: {
                        height: "var(--radix-accordion-content-height)",
                    },
                },
                "accordion-up": {
                    from: {
                        height: "var(--radix-accordion-content-height)",
                    },
                    to: {
                        height: "0",
                    },
                },
                glow: {
                    'from': { 'box-shadow': '0 0 5px var(--hacker-green)' },
                    'to': { 'box-shadow': '0 0 20px var(--hacker-green), 0 0 30px var(--hacker-green)' }
                },
                'pulse-green': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' }
                },
                'scan-line': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                }
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                'glow': 'glow 2s ease-in-out infinite alternate',
                'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'scan-line': 'scan-line 3s linear infinite',
            },
        },
    },
    plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
