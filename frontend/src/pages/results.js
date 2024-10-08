import React, { useEffect } from 'react';
import Navbar from '../components/navbar';
import { useParams } from 'react-router-dom';

const Results = () => {
    const { jobId } = useParams();

    useEffect(() => {
        // Fetch the job results
        fetch(`/api/results/${jobId}`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
            });
    }, []);

    return (
        <div>
            <Navbar />
            <p>Job ID: <span style={{fontWeight: "bold"}}>{jobId}</span></p> 
            <p>TOL Page here</p>
        </div>
    );
};

export default Results;