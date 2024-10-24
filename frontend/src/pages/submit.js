import { React, useState, useRef, useEffect } from "react";
import Navbar from "../components/navbar.js";
import Footer from "../components/footer.js";
import { useNavigate } from "react-router-dom";
import "../components/submit.css";

const Home = () => {
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [canSubmit, setCanSubmit] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(false); // Once button is clicked, submit status set to True, ensure no double submission
    const [fastaStatus, setFastaStatus] = useState("");
    const jobInput = useRef(null);
    const emailInput = useRef(null);
    const fastaInput = useRef(null);

    const [selectedNumSeq, setSelectedNumSeq] = useState(1000);
    const [selectedFoldingProgram, setSelectedFoldingProgram] = useState("colabfold");
    const [selectedPhylogeneticProgram, setSelectedPhylogeneticProgram] = useState("FastTree");
    const [selectedAncestralProgram, setSelectedAncestralProgram] = useState("GRASP");
    const [selectedAlignmentProgram, setSelectedAlignmentProgram] = useState("muscle");

    let navigate = useNavigate();

    const toggleSettingsDropdown = () => {
        setIsSettingsVisible(!isSettingsVisible); // Toggle the state
    };

    const validateInput = () => {
        const fasta = fastaInput.current.value.trim();  // Remove any extra whitespace
        const lines = fasta.split('\n');  // Split the input into lines
    
        // Check if empty input
        if (fasta === "") {
            setFastaStatus("empty");
            return;
        }
    
        // Check for header line
        if (!lines[0].startsWith('>')) {
            setFastaStatus("noHeader");
            return;
        }
    
        // Check if the remaining lines contain only valid characters for the sequence
        const sequenceRegex = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
        let sequenceLength = 0;  // Variable to count the sequence length
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!sequenceRegex.test(line)) {
                setFastaStatus("invalid");
                return;
            }
            sequenceLength += line.length;  // Add line length to the total sequence length
        }
    
        // Check if sequence length is within the valid range
        if (sequenceLength < 50) {
            setFastaStatus("tooShort");
            return;
        }
    
        if (sequenceLength > 1000) {
            setFastaStatus("tooLong");
            return;
        }
    
        // If all checks pass, mark as valid
        setFastaStatus("valid");
    };
    

    useEffect(() => {
        if (fastaStatus === "valid") {
            setCanSubmit(true);
        } else {
            setCanSubmit(false);
        }
    }, [fastaStatus]);


    const submitJob = () => {
        setSubmitStatus(true); // Prevent double submission
        var jobName = jobInput.current.value;
        const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

        if (!jobName) {
            // Generate a random job name if none is provided
            jobName = "EzSEA_" + id
        } else {
            jobName = jobName.replace(/\s/g, "_");  // Replace spaces with underscores
            jobName = jobName + "_" + id
        }

        const json = {
            "job_name": jobName,
            "job_id": id,
            "email": emailInput.current.value,
            "sequence": fastaInput.current.value.trim(), //Trim whitespace, it can cause errors in pipeline
            "folding_program": selectedFoldingProgram,
            "tree_program": selectedPhylogeneticProgram,
            "asr_program": selectedAncestralProgram,
            "align_program": selectedAlignmentProgram,
            "num_seq": selectedNumSeq
        }

        // Send JSON to backend
        fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
            .then(response => {
                if (response.status !== 200) {
                    return response.json().then(data => {
                        console.log('Backend error:', data.error);
                        navigate("/job-queued", {
                            state: {
                                error: data.error
                            }
                        });
                    });
                } else {
                    response.json().then(data => {
                        var currentdate = new Date();
                        var datetime = "" + currentdate.getDate() + "/"
                            + (currentdate.getMonth() + 1) + "/"
                            + currentdate.getFullYear() + " @ "
                            + currentdate.getHours() + ":"
                            + currentdate.getMinutes() + ":"
                            + currentdate.getSeconds();

                        // Redirect to the results page
                        navigate("/job-queued", {
                            state: {
                                jobId: id,
                                email: emailInput.current.value,
                                time: datetime,
                                error: data.error || null
                            }
                        });
                    });

                }
            })
            .catch((error) => {
                console.error('Error:', error);
                navigate("/job-queued", {
                    state: {
                        error: "An error occurred while attempting to submit the job. Please try again later."
                    }
                });
                return;
            });
    }

    const populateExample = () => {
        fastaInput.current.value = ">PA14_rph\nMNRPSGRAADQLRPIRITRHYTKHAEGSVLVEFGDTKVICTVSAESGVPRFLKGQGQGWLTAEYGMLPRSTGERNQREASRGKQGGRTLEIQRLIGRSLRAALDLSKLGENTLYIDCDVIQADGGTRTASITGATVALIDALAVLKKRGALKGNPLKQMVAAVSVGIYQGVPVLDLDYLEDSAAETDLNVVMTDAGGFIEVQGTAEGAPFRPAELNAMLELAQQGMQELFELQRAALAE\n";
        validateInput();
    }


    const statusMsg = () => {
        switch (fastaStatus) {
            case "valid":
                return (
                    <span className="bp3-tag bp3-intent-success">
                        <span icon="tick" className="bp3-icon bp3-icon-tick" style={{ transform: "translateY(2px)" }} >
                            <svg data-icon="tick" width="16" height="16" viewBox="0 0 16 16">
                                <desc>tick</desc>
                                <path d="M14 3c-.28 0-.53.11-.71.29L6 10.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42l4 4c.18.18.43.29.71.29s.53-.11.71-.29l8-8A1.003 1.003 0 0014 3z" fillRule="evenodd"></path>
                            </svg>
                        </span>
                        <span className="bp3-text-overflow-ellipsis bp3-fill">Valid sequence</span>
                    </span>
                );
            case "short": {
                return (
                    <span className="bp3-tag bp3-intent-danger">
                        <span icon="cross" className="bp3-icon bp3-icon-cross">
                            <svg data-icon="cross" width="16" height="16" viewBox="0 0 16 16" style={{ transform: "translateY(2px)" }} >
                                <desc>cross</desc>
                                <path d="M9.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l3.29 3.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z" fillRule="evenodd"></path>
                            </svg>
                        </span>
                        <span className="bp3-text-overflow-ellipsis bp3-fill">Input sequence is too short (minimum: 30 residues)</span>
                    </span>
                );
            }
            case "noHeader": {
                return (
                    <span className="bp3-tag bp3-intent-danger">
                        <span icon="cross" className="bp3-icon bp3-icon-cross">
                            <svg data-icon="cross" width="16" height="16" viewBox="0 0 16 16" style={{ transform: "translateY(2px)" }} >
                                <desc>cross</desc>
                                <path d="M9.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l3.29 3.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z" fillRule="evenodd"></path>
                            </svg>
                        </span>
                        <span className="bp3-text-overflow-ellipsis bp3-fill">Missing header</span>
                    </span>
                );
            }
            case "invalid": {
                return (
                    <span className="bp3-tag bp3-intent-danger">
                        <span icon="cross" className="bp3-icon bp3-icon-cross">
                            <svg data-icon="cross" width="16" height="16" viewBox="0 0 16 16" style={{ transform: "translateY(2px)" }}>
                                <desc>cross</desc>
                                <path d="M9.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l3.29 3.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z" fillRule="evenodd"></path>
                            </svg>
                        </span>
                        <span className="bp3-text-overflow-ellipsis bp3-fill">Invalid sequence</span>
                    </span>
                );
            }
            case "tooShort": {
                return (
                    <span className="bp3-tag bp3-intent-danger">
                        <span icon="cross" className="bp3-icon bp3-icon-cross">
                            <svg data-icon="cross" width="16" height="16" viewBox="0 0 16 16" style={{ transform: "translateY(2px)" }}>
                                <desc>cross</desc>
                                <path d="M9.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l3.29 3.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z" fillRule="evenodd"></path>
                            </svg>
                        </span>
                        <span className="bp3-text-overflow-ellipsis bp3-fill">Sequence less than 50AA</span>
                    </span>
                );
            }
            case "tooLong": {
                return (
                    <span className="bp3-tag bp3-intent-danger">
                        <span icon="cross" className="bp3-icon bp3-icon-cross">
                            <svg data-icon="cross" width="16" height="16" viewBox="0 0 16 16" style={{ transform: "translateY(2px)" }}>
                                <desc>cross</desc>
                                <path d="M9.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l3.29 3.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z" fillRule="evenodd"></path>
                            </svg>
                        </span>
                        <span className="bp3-text-overflow-ellipsis bp3-fill">Sequence longer than 1000AA</span>
                    </span>
                );
            }
            default: {
                return (
                    <span className="bp3-tag bp3-intent-primary">
                        <span className="bp3-text-overflow-ellipsis bp3-fill">Please enter your protein sequence</span>
                    </span>
                );
            }
        }
    };

    return (
        <div style={{ userSelect: "none" }}>
            <Navbar />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: "1 0 auto" }}>
                <div style={{ textAlign: "center", margin: "2em auto 0px", width: "40%", padding: "0.5em", flex: "1 1 0" }}>
                    <img src={process.env.PUBLIC_URL + "/ezsea_logo.svg"} alt="Logo" style={{ width: "35%", marginBottom: "1em" }}></img>
                    <h1 style={{ fontSize: "2em", marginBottom: "0.5em" }}>EzSEA</h1>
                    <p>Enzyme Sequence Evolution Analysis is a tool that combines structure, phylogenetics, and ancestral state reconstruction to delineate an enzyme from its closest relatives and identify evolutionarily important residues.</p>
                    <div>
                        <div> {/* This div is for text input and examples */}
                            <textarea placeholder="Sequence in FASTA format" className="data-input" ref={fastaInput} onChange={validateInput} style={{ height: "150px", width: "100%", resize: "vertical", minHeight: "100px" }}></textarea>
                            <div>
                                <div style={{ display: "flex", marginTop: "0.3em", justifyContent: "space-between" }}>
                                    {statusMsg()}
                                    <span className="bp3-popover-wrapper">
                                        <div className="bp3-popover-target">
                                            <button type="button" className="bp3-button bp3-minimal bp3-small" onClick={() => populateExample()}>
                                                <span className="bp3-button-text">Example</span>
                                            </button>
                                        </div>
                                    </span>
                                </div>
                            </div>
                        </div> {/* End div for text input and examples */}
                        <div style={{ display: "flex", marginTop: "1em", marginBottom: "1em", minHeight: "2pt", placeContent: "center" }}></div>
                        <div style={{ marginTop: "2em" }}>
                            <button type="button" className="bp3-button bp3-minimal" onClick={() => toggleSettingsDropdown()}>
                                {isSettingsVisible ? (
                                    <span icon="caret-down" className="bp3-icon bp3-icon-caret-down">
                                        <svg data-icon="caret-down" width="16" height="16" viewBox="0 0 16 16">
                                            <desc>caret-down</desc>
                                            <path d="M12 6.5c0-.28-.22-.5-.5-.5h-7a.495.495 0 00-.37.83l3.5 4c.09.1.22.17.37.17s.28-.07.37-.17l3.5-4c.08-.09.13-.2.13-.33z" fillRule="evenodd"></path>
                                        </svg>
                                    </span>
                                ) : (
                                    <span icon="caret-right" className="bp3-icon bp3-icon-caret-right">
                                        <svg data-icon="caret-right" width="16" height="16" viewBox="0 0 16 16">
                                            <desc>caret-right</desc>
                                            <path d="M11 8c0-.15-.07-.28-.17-.37l-4-3.5A.495.495 0 006 4.5v7a.495.495 0 00.83.37l4-3.5c.1-.09.17-.22.17-.37z" fillRule="evenodd"></path>
                                        </svg>
                                    </span>
                                )}
                                <span className="bp3-button-text">{isSettingsVisible ? "Hide advanced settings" : "Show advanced settings"}</span>
                            </button>
                            <div className="bp3-collapse">
                                <div className="bp3-collapse-body" style={{ transform: isSettingsVisible ? "translateY(0px)" : "translateY(-557px)" }}>
                                    {isSettingsVisible ? (
                                        <div className="bp3-card bp3-elevation-0">
                                            <div>
                                                <p>Number of Sequences:</p>
                                                <span>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedNumSeq(100)}
                                                        style={{
                                                            backgroundColor: selectedNumSeq == 100 ? '#007bff' : '#eee',
                                                            color: selectedNumSeq == 100 ? 'white' : 'black'
                                                        }}
                                                    >
                                                        100
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedNumSeq(200)}
                                                        style={{
                                                            backgroundColor: selectedNumSeq == 200 ? '#007bff' : '#eee',
                                                            color: selectedNumSeq == 200 ? 'white' : 'black'
                                                        }}
                                                    >
                                                        200
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedNumSeq(500)}
                                                        style={{
                                                            backgroundColor: selectedNumSeq == 500 ? '#007bff' : '#eee',
                                                            color: selectedNumSeq == 500 ? 'white' : 'black'
                                                        }}
                                                    >
                                                        500
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedNumSeq(1000)}
                                                        style={{
                                                            backgroundColor: selectedNumSeq == 1000 ? '#007bff' : '#eee',
                                                            color: selectedNumSeq == 1000 ? 'white' : 'black'
                                                        }}
                                                    >
                                                        1000
                                                    </button>
                                                </span>
                                                <p>Protein Folding Program:</p>
                                                <span>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedFoldingProgram('colabfold')}
                                                        style={{
                                                            backgroundColor: selectedFoldingProgram === 'colabfold' ? '#007bff' : '#eee',
                                                            color: selectedFoldingProgram === 'colabfold' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        colabfold
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedFoldingProgram('pdb')}
                                                        style={{
                                                            backgroundColor: selectedFoldingProgram === 'pdb' ? '#007bff' : '#eee',
                                                            color: selectedFoldingProgram === 'pdb' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        pdb
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedFoldingProgram('none')}
                                                        style={{
                                                            backgroundColor: selectedFoldingProgram === 'none' ? '#007bff' : '#eee',
                                                            color: selectedFoldingProgram === 'none' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        none
                                                    </button>
                                                </span>

                                                <p>Phylogenetic Tree Program:</p>
                                                <span>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedPhylogeneticProgram('FastTree')}
                                                        style={{
                                                            backgroundColor: selectedPhylogeneticProgram === 'FastTree' ? '#007bff' : '#eee',
                                                            color: selectedPhylogeneticProgram === 'FastTree' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        FastTree
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedPhylogeneticProgram('iqtree')}
                                                        style={{
                                                            backgroundColor: selectedPhylogeneticProgram === 'iqtree' ? '#007bff' : '#eee',
                                                            color: selectedPhylogeneticProgram === 'iqtree' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        iqtree
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedPhylogeneticProgram('raxml')}
                                                        style={{
                                                            backgroundColor: selectedPhylogeneticProgram === 'raxml' ? '#007bff' : '#eee',
                                                            color: selectedPhylogeneticProgram === 'raxml' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        raxml
                                                    </button>
                                                </span>

                                                <p>Ancestral State Inference Program:</p>
                                                <span>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedAncestralProgram('GRASP')}
                                                        style={{
                                                            backgroundColor: selectedAncestralProgram === 'GRASP' ? '#007bff' : '#eee',
                                                            color: selectedAncestralProgram === 'GRASP' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        GRASP
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedAncestralProgram('iqtree')}
                                                        style={{
                                                            backgroundColor: selectedAncestralProgram === 'iqtree' ? '#007bff' : '#eee',
                                                            color: selectedAncestralProgram === 'iqtree' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        iqtree
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedAncestralProgram('raxml-ng')}
                                                        style={{
                                                            backgroundColor: selectedAncestralProgram === 'raxml-ng' ? '#007bff' : '#eee',
                                                            color: selectedAncestralProgram === 'raxml-ng' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        raxml-ng
                                                    </button>
                                                </span>
                                                <p>Alignment Program:</p>
                                                <span>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedAlignmentProgram('muscle')}
                                                        style={{
                                                            backgroundColor: selectedAlignmentProgram === 'muscle' ? '#007bff' : '#eee',
                                                            color: selectedAlignmentProgram === 'muscle' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        MUSCLE
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedAlignmentProgram('mafft')}
                                                        style={{
                                                            backgroundColor: selectedAlignmentProgram === 'mafft' ? '#007bff' : '#eee',
                                                            color: selectedAlignmentProgram === 'mafft' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        mafft
                                                    </button>
                                                    <button className="bp3-button bp3-minimal"
                                                        onClick={() => setSelectedAlignmentProgram('clustalo')}
                                                        style={{
                                                            backgroundColor: selectedAlignmentProgram === 'clustalo' ? '#007bff' : '#eee',
                                                            color: selectedAlignmentProgram === 'clustalo' ? 'white' : 'black'
                                                        }}
                                                    >
                                                        clustalo
                                                    </button>
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div></div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ width: "76%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", marginTop: "2em", marginBottom: "2em" }}>
                            <div className="bp3-form-group bp3-inline">
                                <label className="bp3-label">Job name <span className="bp3-text-muted">(optional)</span></label>
                                <div className="bp3-form-content">
                                    <div className="bp3-input-group">
                                        <input type="text" id="jobname-input" ref={jobInput} placeholder="Your job name" className="bp3-input" />
                                    </div>
                                </div>
                            </div>
                            <div className="bp3-form-group bp3-inline">
                                <label className="bp3-label">Your e-mail address <span className="bp3-text-muted">(optional)</span></label>
                                <div className="bp3-form-content">
                                    <div className="bp3-input-group">
                                        <input type="text" id="email-input" ref={emailInput} placeholder="your@email.com" className="bp3-input" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button type="button" disabled={!canSubmit || submitStatus} onClick={submitJob} className="bp3-button bp3-intent-primary">
                            <span className="bp3-button-text" >{submitStatus ? "Submitting..." : "Submit EzSEA job"}</span>
                            <span icon="circle-arrow-right" className="bp3-icon bp3-icon-circle-arrow-right">
                                <svg data-icon="circle-arrow-right" width="16" height="16" viewBox="0 0 16 16">
                                    <desc>circle-arrow-right</desc>
                                    <path d="M8.71 4.29a1.003 1.003 0 00-1.42 1.42L8.59 7H5c-.55 0-1 .45-1 1s.45 1 1 1h3.59L7.3 10.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71l3-3c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71l-3-3zM8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fillRule="evenodd"></path>
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Home;
