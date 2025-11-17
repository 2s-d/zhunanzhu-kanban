import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const searilizeError = (error) => {
    if (error instanceof Error) {
        return error.message + '\n' + error.stack;
    }
    return JSON.stringify(error, null, 2);
};
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { className: "p-4 border border-red-500 rounded", children: [_jsx("h2", { className: "text-red-500", children: "Something went wrong." }), _jsx("pre", { className: "mt-2 text-sm", children: searilizeError(this.state.error) })] }));
        }
        return this.props.children;
    }
}
