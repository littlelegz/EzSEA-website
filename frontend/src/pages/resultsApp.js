/**
 * resultsApp.js
 * This file provides the context for the components in the results page.
 */
import React from 'react';
import { TolProvider } from '../components/tolContext';
import Results from './results';

function ResultsApp() {
    return (
        <TolProvider>
            <Results />
        </TolProvider>
    );
}

export default ResultsApp;