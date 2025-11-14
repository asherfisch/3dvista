document.addEventListener('DOMContentLoaded', () => {
    const panoramaContainer = document.getElementById('panorama');

    // Initialize Pannellum Viewer
    const viewer = window.viewer = pannellum.viewer('panorama', {
        "type": "equirectangular",
        "panorama": "./alma.jpg",
        "autoLoad": true,
        "compass": false,
        "northOffset": 240,
        "showControls": false
    });

    let sequences = {};
    let currentSequenceName = null;

    // --- DOM Elements ---
    const newSequenceNameInput = document.getElementById('new-sequence-name');
    const addSequenceBtn = document.getElementById('add-sequence-btn');
    const sequencesList = document.getElementById('sequences-list');
    const keyframesContainer = document.getElementById('keyframes-container');
    const currentSequenceTitle = document.getElementById('current-sequence-title');
    const keyframesList = document.getElementById('keyframes-list');
    const addKeyframeBtn = document.getElementById('add-keyframe-btn');
    const playSequenceBtn = document.getElementById('play-sequence-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file');
    const coordsDisplay = document.getElementById('camera-coords-display');

    // --- Functions ---
    const updateCoordsDisplay = () => {
        const yaw = viewer.getYaw().toFixed(2);
        const pitch = viewer.getPitch().toFixed(2);
        const hfov = viewer.getHfov().toFixed(2);
        coordsDisplay.textContent = `Yaw: ${yaw}° / Pitch: ${pitch}° / Zoom: ${hfov}°`;
    };

    const renderSequences = () => {
        sequencesList.innerHTML = '';
        for (const name in sequences) {
            const seqEl = document.createElement('div');
            seqEl.className = 'sequence-item';

            const seqName = document.createElement('span');
            seqName.textContent = name;
            seqName.addEventListener('click', () => {
                currentSequenceName = name;
                renderSequences();
                renderKeyframes();
                keyframesContainer.style.display = 'block';
                currentSequenceTitle.textContent = `Keyframes for: ${name}`;
            });

            if (name === currentSequenceName) {
                seqEl.classList.add('selected');
            }

            const startFromCurrentCheckbox = document.createElement('input');
            startFromCurrentCheckbox.type = 'checkbox';
            startFromCurrentCheckbox.checked = sequences[name].options.startFromCurrent;
            startFromCurrentCheckbox.addEventListener('change', () => {
                sequences[name].options.startFromCurrent = startFromCurrentCheckbox.checked;
                updatePlayButtonState();
            });

            const label = document.createElement('label');
            label.textContent = 'Start from current position';
            label.prepend(startFromCurrentCheckbox);

            seqEl.appendChild(seqName);
            seqEl.appendChild(label);
            sequencesList.appendChild(seqEl);
        }
    };

    const renderKeyframes = () => {
        keyframesList.innerHTML = '';
        if (currentSequenceName && sequences[currentSequenceName]) {
            sequences[currentSequenceName].keyframes.forEach((kf, index) => {
                const kfEl = document.createElement('div');
                kfEl.className = 'keyframe-item';

                const kfInfo = document.createElement('div');
                kfInfo.innerHTML = `
                    <span>Keyframe ${index + 1}:</span>
                    <label>Yaw: <input type="number" class="kf-yaw" value="${kf.yaw.toFixed(2)}" step="0.1"></label>
                    <label>Pitch: <input type="number" class="kf-pitch" value="${kf.pitch.toFixed(2)}" step="0.1"></label>
                    <label>Zoom: <input type="number" class="kf-hfov" value="${kf.hfov.toFixed(2)}" step="0.1"></label>
                    <label>Duration: <input type="number" class="kf-duration" value="${kf.duration}" step="0.1"></label>
                    <label>Ease:
                        <select class="kf-ease">
                            <option value="none">Linear</option>
                            <option value="power1.inOut">Slow</option>
                            <option value="power2.inOut">Medium</option>
                            <option value="power3.inOut">Fast</option>
                            <option value="back.out(1.7)">Back</option>
                            <option value="elastic.out(1, 0.3)">Elastic</option>
                            <option value="bounce.out">Bounce</option>
                        </select>
                    </label>
                `;

                kfEl.appendChild(kfInfo);

                // Set the selected option for the dropdown
                const easeSelect = kfEl.querySelector('.kf-ease');
                easeSelect.value = kf.ease;

                const saveBtn = document.createElement('button');
                saveBtn.textContent = 'Save';
                saveBtn.addEventListener('click', () => {
                    const newYaw = parseFloat(kfEl.querySelector('.kf-yaw').value);
                    const newPitch = parseFloat(kfEl.querySelector('.kf-pitch').value);
                    const newHfov = parseFloat(kfEl.querySelector('.kf-hfov').value);
                    const newDuration = parseFloat(kfEl.querySelector('.kf-duration').value);
                    const newEase = kfEl.querySelector('.kf-ease').value;

                    if (!isNaN(newYaw) && !isNaN(newPitch) && !isNaN(newHfov) && !isNaN(newDuration)) {
                        kf.yaw = newYaw;
                        kf.pitch = newPitch;
                        kf.hfov = newHfov;
                        kf.duration = newDuration;
                        kf.ease = newEase;
                        renderKeyframes();
                    }
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sequences[currentSequenceName].keyframes.splice(index, 1);
                    renderKeyframes();
                });

                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'keyframe-buttons';
                buttonsContainer.appendChild(saveBtn);
                buttonsContainer.appendChild(deleteBtn);

                kfEl.appendChild(kfInfo);
                kfEl.appendChild(buttonsContainer);
                keyframesList.appendChild(kfEl);
            });
        }
        updatePlayButtonState();
    };

    const addSequence = () => {
        const name = newSequenceNameInput.value.trim();
        if (name && !sequences[name]) {
            sequences[name] = {
                keyframes: [],
                options: {
                    startFromCurrent: false
                }
            };
            newSequenceNameInput.value = '';
            currentSequenceName = name;
            renderSequences();
            renderKeyframes();
            keyframesContainer.style.display = 'block';
            currentSequenceTitle.textContent = `Keyframes for: ${name}`;
        }
        updatePlayButtonState();
    };

    const addKeyframe = () => {
        if (currentSequenceName) {
            const yaw = viewer.getYaw();
            const pitch = viewer.getPitch();
            const hfov = viewer.getHfov();
            sequences[currentSequenceName].keyframes.push({ yaw, pitch, hfov, duration: 2, ease: "power1.inOut" });
            renderKeyframes();
        }
        updatePlayButtonState();
    };

    const playSequence = () => {
        if (!currentSequenceName || !sequences[currentSequenceName]) return;

        const sequence = sequences[currentSequenceName];
        const keyframes = sequence.keyframes;
        const options = sequence.options;
        const keyframesCount = keyframes.length;

        if (keyframesCount === 0) {
            return;
        }

        const timeline = gsap.timeline();

        let startState = {
            yaw: viewer.getYaw(),
            pitch: viewer.getPitch(),
            hfov: viewer.getHfov()
        };

        let keyframesToAnimate;

        if (options.startFromCurrent) {
            keyframesToAnimate = keyframes;
        } else {
            // If not starting from current, the first keyframe is the start state.
            // The animation is from the first keyframe to the rest.
            // So we need at least 2 keyframes.
            if (keyframesCount < 2) {
                return;
            }
            const firstKf = keyframes[0];
            startState.yaw = firstKf.yaw;
            startState.pitch = firstKf.pitch;
            startState.hfov = firstKf.hfov;
            keyframesToAnimate = keyframes.slice(1);
        }

        // Set viewer to the starting position of the animation
        viewer.setYaw(startState.yaw, false);
        viewer.setPitch(startState.pitch, false);
        viewer.setHfov(startState.hfov, false);

        // This object will be tweened by GSAP
        let animatedState = {...startState};

        keyframesToAnimate.forEach(kf => {
            timeline.to(animatedState, {
                yaw: kf.yaw,
                pitch: kf.pitch,
                hfov: kf.hfov,
                duration: kf.duration,
                ease: kf.ease,
                onUpdate: () => {
                    viewer.setYaw(animatedState.yaw, false);
                    viewer.setPitch(animatedState.pitch, false);
                    viewer.setHfov(animatedState.hfov, false);
                }
            });
        });
    };

    const updatePlayButtonState = () => {
        if (currentSequenceName && sequences[currentSequenceName]) {
            const sequence = sequences[currentSequenceName];
            const keyframesCount = sequence.keyframes.length;
            const startFromCurrent = sequence.options.startFromCurrent;

            if (keyframesCount === 0) {
                playSequenceBtn.disabled = true;
            } else if (startFromCurrent) {
                playSequenceBtn.disabled = false;
            } else {
                playSequenceBtn.disabled = keyframesCount < 2;
            }
        } else {
            playSequenceBtn.disabled = true;
        }
    };

    const exportSequences = () => {
        const data = JSON.stringify(sequences, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'panorama-sequences.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importSequences = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSequences = JSON.parse(e.target.result);
                    sequences = importedSequences;
                    currentSequenceName = null;
                    renderSequences();
                    keyframesContainer.style.display = 'none';
                    alert('Sequences imported successfully!');
                } catch (error) {
                    alert('Error importing sequences: Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    };

    // --- Event Listeners ---
    addSequenceBtn.addEventListener('click', addSequence);
    addKeyframeBtn.addEventListener('click', addKeyframe);
    playSequenceBtn.addEventListener('click', playSequence);
    exportBtn.addEventListener('click', exportSequences);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importSequences);
    viewer.on('viewchange', updateCoordsDisplay);

    renderSequences();
    updatePlayButtonState();
    updateCoordsDisplay(); // Initial call
});
