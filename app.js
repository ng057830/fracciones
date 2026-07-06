// --- CONFIGURACIÓN DE AUDIO SINTÉTICO (API WEB AUDIO) ---
let audioCtx;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, now); // E4
        osc.frequency.setValueAtTime(440, now + 0.08); // A4
        osc.frequency.setValueAtTime(554, now + 0.16); // C#5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
    } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'slice') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'victory') {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Acorde mayor
        notes.forEach((freq, index) => {
            const noteOsc = audioCtx.createOscillator();
            const noteGain = audioCtx.createGain();
            noteOsc.connect(noteGain);
            noteGain.connect(audioCtx.destination);
            noteOsc.type = 'triangle';
            noteOsc.frequency.setValueAtTime(freq, now + index * 0.07);
            noteGain.gain.setValueAtTime(0.12, now + index * 0.07);
            noteGain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.07 + 0.35);
            noteOsc.start(now + index * 0.07);
            noteOsc.stop(now + index * 0.07 + 0.4);
        });
    }
}

// --- AUXILIARES MATEMÁTICOS ---
function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b !== 0) { [a, b] = [b, a % b]; }
    return a;
}
function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

// --- ESTADO DEL JUEGO ---
let prob = {};
let score = parseInt(localStorage.getItem('pizza_fraction_score')) || 0;
let streak = parseInt(localStorage.getItem('pizza_fraction_streak')) || 0;

// --- ELEMENTOS DOM ---
const ui = {
    displayN1: document.getElementById('display-n1'),
    displayD1: document.getElementById('display-d1'),
    displayN2: document.getElementById('display-n2'),
    displayD2: document.getElementById('display-d2'),
    
    displayEqN1: document.getElementById('display-eq-n1'),
    displayEqD1: document.getElementById('display-eq-d1'),
    displayEqN2: document.getElementById('display-eq-n2'),
    displayEqD2: document.getElementById('display-eq-d2'),
    
    displaySumN: document.getElementById('display-sum-n'),
    displaySumD: document.getElementById('display-sum-d'),
    
    displayFinalN: document.getElementById('display-final-n'),
    displayFinalD: document.getElementById('display-final-d'),
    
    pizza1Container: document.getElementById('pizza1-container'),
    pizza2Container: document.getElementById('pizza2-container'),
    pizza3Container: document.getElementById('pizza3-container'),
    
    equivDisplay1: document.getElementById('equiv-display-1'),
    equivDisplay2: document.getElementById('equiv-display-2'),
    simpFinalDisplay: document.getElementById('simp-final-display'),
    frac3Display: document.getElementById('frac3-display'),
    
    hintD1: document.getElementById('hint-d1'),
    hintD2: document.getElementById('hint-d2'),
    mcmDisplays: document.querySelectorAll('.mcm-display'),

    sumDisplayN1: document.getElementById('sum-display-n1'),
    sumDisplayN2: document.getElementById('sum-display-n2'),
    simpDisplayN: document.getElementById('simp-display-n'),
    simpDesc: document.getElementById('simp-desc'),

    sizeWarning: document.getElementById('size-warning'),
    sizeOk: document.getElementById('size-ok'),

    inputs: {
        mcm: document.getElementById('input-mcm'),
        eqN1: document.getElementById('input-eq-n1'),
        eqN2: document.getElementById('input-eq-n2'),
        sumN: document.getElementById('input-sum-n'),
        simpN: document.getElementById('input-simp-n'),
        simpD: document.getElementById('input-simp-d'),
    },
    btns: {
        mcm: document.getElementById('btn-mcm'),
        eq: document.getElementById('btn-eq'),
        sum: document.getElementById('btn-sum'),
        simp: document.getElementById('btn-simp'),
    },
    errors: {
        mcm: document.getElementById('error-mcm'),
        eq: document.getElementById('error-eq'),
        sum: document.getElementById('error-sum'),
        simp: document.getElementById('error-simp'),
    },
    steps: {
        s1: document.getElementById('step1'),
        s2: document.getElementById('step2'),
        s3: document.getElementById('step3'),
        s4: document.getElementById('step4'),
        success: document.getElementById('success-screen')
    },
    tabs: {
        t1: document.getElementById('step-tab-1'),
        t2: document.getElementById('step-tab-2'),
        t3: document.getElementById('step-tab-3'),
        t4: document.getElementById('step-tab-4'),
    }
};

// --- DIBUJADO DE PIZZAS CON SVG ---
function getSlicePath(cx, cy, r, startAngle, endAngle) {
    if (Math.abs(endAngle - startAngle - 2 * Math.PI) < 0.001) {
        return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
    }
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

function renderPizza(container, num, den, subdiv, type) {
    container.innerHTML = '';
    
    const totalSlices = den * subdiv;
    const activeSlices = num * subdiv;
    
    const pizzasNeeded = Math.max(1, Math.ceil(activeSlices / totalSlices));
    
    const wrapper = document.createElement("div");
    wrapper.className = "flex gap-2 flex-wrap justify-center pizza-svg-container";
    
    for (let p = 0; p < pizzasNeeded; p++) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 160 160");
        svg.setAttribute("class", "w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transition-transform duration-300");
        
        // Plato base
        const plate = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        plate.setAttribute("cx", "80");
        plate.setAttribute("cy", "80");
        plate.setAttribute("r", "76");
        plate.setAttribute("fill", "#fdfbf7");
        plate.setAttribute("stroke", "#e2e8f0");
        plate.setAttribute("stroke-width", "2.5");
        svg.appendChild(plate);
        
        // Borde decorado del plato
        const plateBorder = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        plateBorder.setAttribute("cx", "80");
        plateBorder.setAttribute("cy", "80");
        plateBorder.setAttribute("r", "73");
        plateBorder.setAttribute("fill", "none");
        plateBorder.setAttribute("stroke", "#cbd5e1");
        plateBorder.setAttribute("stroke-dasharray", "3,5");
        plateBorder.setAttribute("stroke-width", "1");
        svg.appendChild(plateBorder);

        // Base de la masa (crust)
        const crustBase = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        crustBase.setAttribute("cx", "80");
        crustBase.setAttribute("cy", "80");
        crustBase.setAttribute("r", "60");
        crustBase.setAttribute("fill", "#f1f5f9"); // Inactiva
        crustBase.setAttribute("stroke", "#cbd5e1");
        crustBase.setAttribute("stroke-width", "2");
        svg.appendChild(crustBase);

        // Rebanadas
        const startSliceIndex = p * totalSlices;
        
        for (let i = 0; i < totalSlices; i++) {
            const globalSliceIndex = startSliceIndex + i;
            const isActive = globalSliceIndex < activeSlices;
            
            const startAngle = (i * 2 * Math.PI) / totalSlices - Math.PI / 2;
            const endAngle = ((i + 1) * 2 * Math.PI) / totalSlices - Math.PI / 2;
            
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const pathStr = getSlicePath(80, 80, 60, startAngle, endAngle);
            path.setAttribute("d", pathStr);
            
            if (isActive) {
                if (type === 'pepperoni') {
                    path.setAttribute("fill", "#fee2e2");
                    path.setAttribute("stroke", "#f87171");
                    path.setAttribute("stroke-width", "1.5");
                } else if (type === 'veggie') {
                    path.setAttribute("fill", "#ecfdf5");
                    path.setAttribute("stroke", "#34d399");
                    path.setAttribute("stroke-width", "1.5");
                } else { // combined
                    path.setAttribute("fill", "#fef3c7");
                    path.setAttribute("stroke", "#fbbf24");
                    path.setAttribute("stroke-width", "1.5");
                }
            } else {
                path.setAttribute("fill", "#f8fafc");
                path.setAttribute("stroke", "#e2e8f0");
                path.setAttribute("stroke-width", "1");
            }
            svg.appendChild(path);
            
            // Toppings
            if (isActive) {
                const midAngle = (startAngle + endAngle) / 2;
                const isWideSlice = (endAngle - startAngle) > (Math.PI / 4.5);
                
                if (type === 'pepperoni') {
                    if (isWideSlice) {
                        const rx1 = 80 + 34 * Math.cos(midAngle - 0.12);
                        const ry1 = 80 + 34 * Math.sin(midAngle - 0.12);
                        svg.appendChild(createCircle(rx1, ry1, 5.5, "#dc2626", "#991b1b"));

                        const rx2 = 80 + 44 * Math.cos(midAngle + 0.12);
                        const ry2 = 80 + 44 * Math.sin(midAngle + 0.12);
                        svg.appendChild(createCircle(rx2, ry2, 4.5, "#dc2626", "#991b1b"));
                    } else {
                        const rx = 80 + 38 * Math.cos(midAngle);
                        const ry = 80 + 38 * Math.sin(midAngle);
                        svg.appendChild(createCircle(rx, ry, 5, "#dc2626", "#991b1b"));
                    }
                } else if (type === 'veggie') {
                    if (isWideSlice) {
                        const rx1 = 80 + 32 * Math.cos(midAngle - 0.1);
                        const ry1 = 80 + 32 * Math.sin(midAngle - 0.1);
                        svg.appendChild(createCircle(rx1, ry1, 3, "#1e293b", "#0f172a"));
                        
                        const rx2 = 80 + 44 * Math.cos(midAngle + 0.1);
                        const ry2 = 80 + 44 * Math.sin(midAngle + 0.1);
                        svg.appendChild(createVeggieStick(rx2, ry2, midAngle, "#16a34a"));
                    } else {
                        const rx = 80 + 38 * Math.cos(midAngle);
                        const ry = 80 + 38 * Math.sin(midAngle);
                        svg.appendChild(createVeggieStick(rx, ry, midAngle, "#16a34a"));
                    }
                } else {
                    const rx1 = 80 + 32 * Math.cos(midAngle - 0.08);
                    const ry1 = 80 + 32 * Math.sin(midAngle - 0.08);
                    svg.appendChild(createCircle(rx1, ry1, 4.5, "#dc2626", "#991b1b"));
                    
                    const rx2 = 80 + 45 * Math.cos(midAngle + 0.08);
                    const ry2 = 80 + 45 * Math.sin(midAngle + 0.08);
                    svg.appendChild(createCircle(rx2, ry2, 3, "#1e293b", "#0f172a"));
                }
            }
        }
        
        // Líneas de corte de porción
        for (let i = 0; i < totalSlices; i++) {
            const angle = (i * 2 * Math.PI) / totalSlices - Math.PI / 2;
            const x = 80 + 60 * Math.cos(angle);
            const y = 80 + 60 * Math.sin(angle);
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", "80");
            line.setAttribute("y1", "80");
            line.setAttribute("x2", x);
            line.setAttribute("y2", y);
            line.setAttribute("stroke", "#d97706");
            line.setAttribute("stroke-width", "1.2");
            svg.appendChild(line);
        }
        
        // Si hay subdivisión, resaltar cortes originales con líneas más gruesas
        if (subdiv > 1) {
            for (let i = 0; i < den; i++) {
                const angle = (i * 2 * Math.PI) / den - Math.PI / 2;
                const x = 80 + 60 * Math.cos(angle);
                const y = 80 + 60 * Math.sin(angle);
                
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", "80");
                line.setAttribute("y1", "80");
                line.setAttribute("x2", x);
                line.setAttribute("y2", y);
                line.setAttribute("stroke", "#78350f");
                line.setAttribute("stroke-width", "3");
                svg.appendChild(line);
            }
        }
        
        // Borde exterior masa
        const crustOutline = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        crustOutline.setAttribute("cx", "80");
        crustOutline.setAttribute("cy", "80");
        crustOutline.setAttribute("r", "60");
        crustOutline.setAttribute("fill", "none");
        crustOutline.setAttribute("stroke", "#d97706");
        crustOutline.setAttribute("stroke-width", "3.5");
        svg.appendChild(crustOutline);
        
        wrapper.appendChild(svg);
    }
    container.appendChild(wrapper);
}

// Crear Toppings SVG
function createCircle(cx, cy, r, fill, stroke) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    el.setAttribute("cx", cx);
    el.setAttribute("cy", cy);
    el.setAttribute("r", r);
    el.setAttribute("fill", fill);
    el.setAttribute("stroke", stroke);
    el.setAttribute("stroke-width", "0.8");
    return el;
}

function createVeggieStick(cx, cy, angle, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", cx - 1.5);
    el.setAttribute("y", cy - 4.5);
    el.setAttribute("width", "3");
    el.setAttribute("height", "9");
    el.setAttribute("rx", "1.2");
    el.setAttribute("fill", fill);
    el.setAttribute("transform", `rotate(${(angle * 180) / Math.PI + 45}, ${cx}, ${cy})`);
    return el;
}

// Mostrar número mixto si la fracción es impropia
function updateMixedDisplay(num, den, prefix) {
    const container = document.getElementById(`mixed-${prefix}-display`);
    if (!container) return;
    const intEl = document.getElementById(`mixed-${prefix}-int`);
    const fracNumEl = document.getElementById(`mixed-${prefix}-num`);
    const fracDenEl = document.getElementById(`mixed-${prefix}-den`);
    const fracPart = container.querySelector('.frac');
    
    if (num > den) {
        const whole = Math.floor(num / den);
        const rem = num % den;
        
        intEl.textContent = whole;
        
        if (rem === 0) {
            fracPart.style.display = 'none';
        } else {
            fracPart.style.display = 'inline-flex';
            fracNumEl.textContent = rem;
            fracDenEl.textContent = den;
        }
        
        container.classList.remove('hidden');
        container.classList.add('flex');
    } else {
        container.classList.add('hidden');
        container.classList.remove('flex');
    }
}

// --- LÓGICA PRINCIPAL DEL RETO ---
function generateProblem() {
    let d1, d2, n1, n2;
    do {
        d1 = Math.floor(Math.random() * 7) + 2; // 2 al 8
        d2 = Math.floor(Math.random() * 7) + 2; // 2 al 8
    } while (d1 === d2);

    n1 = Math.floor(Math.random() * (d1 - 1)) + 1; // Fracción propia
    n2 = Math.floor(Math.random() * (d2 - 1)) + 1;

    let cLcm = lcm(d1, d2);
    let m1 = cLcm / d1;
    let m2 = cLcm / d2;
    let newN1 = n1 * m1;
    let newN2 = n2 * m2;
    let sumN = newN1 + newN2;
    let cGcd = gcd(sumN, cLcm);

    return { 
        n1, d1, 
        n2, d2, 
        lcm: cLcm, 
        m1, m2, 
        newN1, newN2, 
        sumN, 
        gcd: cGcd, 
        finalN: sumN / cGcd, 
        finalD: cLcm / cGcd 
    };
}

function initGame() {
    prob = generateProblem();

    // Llenar datos de fracciones iniciales en UI
    ui.displayN1.textContent = prob.n1;
    ui.displayD1.textContent = prob.d1;
    ui.displayN2.textContent = prob.n2;
    ui.displayD2.textContent = prob.d2;
    
    // Limpiar datos equivalentes y suma
    ui.equivDisplay1.classList.add('hidden');
    ui.equivDisplay2.classList.add('hidden');
    ui.simpFinalDisplay.classList.add('hidden');
    ui.frac3Display.classList.remove('hidden');

    document.getElementById('display-eq-n1').textContent = '?';
    document.getElementById('display-eq-d1').textContent = '?';
    document.getElementById('display-eq-n2').textContent = '?';
    document.getElementById('display-eq-d2').textContent = '?';

    ui.displaySumN.textContent = '?';
    ui.displaySumD.textContent = '?';

    document.getElementById('display-final-n').textContent = '?';
    document.getElementById('display-final-d').textContent = '?';

    document.getElementById('mixed-sum-display').classList.add('hidden');
    document.getElementById('mixed-sum-display').classList.remove('flex');
    document.getElementById('mixed-final-display').classList.add('hidden');
    document.getElementById('mixed-final-display').classList.remove('flex');

    // Pistas
    ui.hintD1.textContent = prob.d1;
    ui.hintD2.textContent = prob.d2;

    // Renderizar pizzas iniciales sin subdivisión
    renderPizza(ui.pizza1Container, prob.n1, prob.d1, 1, 'pepperoni');
    renderPizza(ui.pizza2Container, prob.n2, prob.d2, 1, 'veggie');
    
    // Pizza 3 vacía
    renderPizza(ui.pizza3Container, 0, prob.lcm, 1, 'combined');

    // Mostrar/Ocultar avisos de tamaño
    ui.sizeWarning.classList.remove('hidden');
    ui.sizeWarning.classList.add('flex');
    ui.sizeOk.classList.add('hidden');
    ui.sizeOk.classList.remove('flex');

    // Resetear inputs e interfaz de pasos
    Object.values(ui.inputs).forEach(input => {
        input.value = '';
        input.classList.remove('error', 'success');
        input.disabled = false;
    });
    Object.values(ui.errors).forEach(err => err.style.display = 'none');

    // Activar botones
    ui.btns.mcm.style.display = 'inline-block';
    ui.btns.eq.style.display = 'inline-block';
    ui.btns.sum.style.display = 'inline-block';
    ui.btns.simp.style.display = 'inline-block';

    // Mostrar Paso 1 de forma compacta (State machine)
    showStep(1);
}

function showStep(stepNumber) {
    const stepsList = ['s1', 's2', 's3', 's4', 'success'];
    stepsList.forEach((stepId, index) => {
        const stepCard = ui.steps[stepId];
        if (index + 1 === stepNumber || (stepId === 'success' && stepNumber === 5)) {
            stepCard.classList.remove('step-hidden');
            setTimeout(() => {
                const firstInput = stepCard.querySelector('input');
                if (firstInput) firstInput.focus();
            }, 150);
        } else {
            stepCard.classList.add('step-hidden');
        }
    });
    updateProgressTabs(stepNumber);
}

function updateProgressTabs(currentStep) {
    for (let i = 1; i <= 4; i++) {
        const tab = ui.tabs[`t${i}`];
        const circle = tab.querySelector('span');
        if (i < currentStep) {
            tab.classList.remove('opacity-40');
            tab.classList.add('opacity-80');
            circle.className = "w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shadow-sm";
            circle.textContent = "✓";
        } else if (i === currentStep) {
            tab.classList.remove('opacity-40');
            tab.classList.add('opacity-100');
            circle.className = "w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow";
            circle.textContent = i;
        } else {
            tab.classList.add('opacity-40');
            tab.classList.remove('opacity-100', 'opacity-80');
            circle.className = "w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold";
            circle.textContent = i;
        }
    }
}

function showError(inputEl, errorEl, msg) {
    playSound('error');
    inputEl.classList.remove('error');
    void inputEl.offsetWidth; // Trigger reflow para reiniciar animación
    inputEl.classList.add('error');
    errorEl.innerHTML = msg;
    errorEl.style.display = 'block';
    inputEl.focus();
}

function setSuccess(inputEl) {
    inputEl.classList.remove('error');
    inputEl.classList.add('success');
    inputEl.disabled = true;
}

function toggleHelpModal(show) {
    initAudio();
    const modal = document.getElementById('help-modal');
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

// --- MANEJADORES DE CADA PASO ---

// PASO 1: MCM
function checkMCM() {
    const val = parseInt(ui.inputs.mcm.value);
    if (val === prob.lcm) {
        playSound('success');
        setSuccess(ui.inputs.mcm);
        ui.errors.mcm.style.display = 'none';
        ui.btns.mcm.style.display = 'none';
        
        playSound('slice');
        renderPizza(ui.pizza1Container, prob.n1, prob.d1, prob.m1, 'pepperoni');
        renderPizza(ui.pizza2Container, prob.n2, prob.d2, prob.m2, 'veggie');

        // Mostrar equivalencias parciales
        ui.displayEqD1.textContent = prob.lcm;
        ui.displayEqD2.textContent = prob.lcm;
        ui.equivDisplay1.classList.remove('hidden');
        ui.equivDisplay2.classList.remove('hidden');

        ui.mcmDisplays.forEach(el => el.textContent = prob.lcm);
        ui.sizeWarning.classList.add('hidden');
        ui.sizeWarning.classList.remove('flex');
        ui.sizeOk.classList.remove('hidden');
        ui.sizeOk.classList.add('flex');

        setTimeout(() => {
            showStep(2);
        }, 400);
    } else {
        let mult1 = [prob.d1, prob.d1*2, prob.d1*3].join(', ');
        let mult2 = [prob.d2, prob.d2*2, prob.d2*3].join(', ');
        showError(
            ui.inputs.mcm, 
            ui.errors.mcm, 
            `💡 Pista: Múltiplos de <b>${prob.d1}</b>: (${mult1}...). Múltiplos de <b>${prob.d2}</b>: (${mult2}...). Busca el primero común.`
        );
    }
}

// PASO 2: Fracciones Equivalentes
function checkEQ() {
    const v1 = parseInt(ui.inputs.eqN1.value);
    const v2 = parseInt(ui.inputs.eqN2.value);
    let isOk = true;

    if (v1 !== prob.newN1) {
        showError(ui.inputs.eqN1, ui.errors.eq, `💡 Pista (Pep.): Si multiplicaste abajo por <b>${prob.m1}</b>, multiplica arriba: <b>${prob.n1} × ${prob.m1}</b>.`);
        isOk = false;
    } else if (v2 !== prob.newN2) {
        setSuccess(ui.inputs.eqN1);
        showError(ui.inputs.eqN2, ui.errors.eq, `👍 ¡Pepperoni listo! En Vegetales: Si abajo multiplicaste por <b>${prob.m2}</b>, multiplica arriba: <b>${prob.n2} × ${prob.m2}</b>.`);
        isOk = false;
    }

    if (isOk) {
        playSound('success');
        setSuccess(ui.inputs.eqN1);
        setSuccess(ui.inputs.eqN2);
        ui.errors.eq.style.display = 'none';
        ui.btns.eq.style.display = 'none';

        document.getElementById('display-eq-n1').textContent = prob.newN1;
        document.getElementById('display-eq-n2').textContent = prob.newN2;

        ui.sumDisplayN1.textContent = prob.newN1;
        ui.sumDisplayN2.textContent = prob.newN2;

        setTimeout(() => {
            showStep(3);
        }, 400);
    }
}

// PASO 3: Sumar
function checkSum() {
    const val = parseInt(ui.inputs.sumN.value);
    if (val === prob.sumN) {
        playSound('success');
        setSuccess(ui.inputs.sumN);
        ui.errors.sum.style.display = 'none';
        ui.btns.sum.style.display = 'none';

        ui.displaySumN.textContent = prob.sumN;
        ui.displaySumD.textContent = prob.lcm;

        renderPizza(ui.pizza3Container, prob.sumN, prob.lcm, 1, 'combined');
        updateMixedDisplay(prob.sumN, prob.lcm, 'sum');

        score += 10;
        streak += 1;
        localStorage.setItem('pizza_fraction_score', score);
        localStorage.setItem('pizza_fraction_streak', streak);
        document.getElementById('score-display').textContent = score;
        document.getElementById('streak-display').textContent = streak;

        if (prob.gcd === 1) {
            setTimeout(() => {
                showStep(5);
                playSound('victory');
                launchConfetti();
            }, 400);
        } else {
            ui.simpDisplayN.textContent = prob.sumN;
            ui.simpDesc.innerHTML = `💡 Pista: ¡Numerador y denominador se pueden dividir exactamente por <b>${prob.gcd}</b>!`;
            setTimeout(() => {
                showStep(4);
            }, 400);
        }
    } else {
        showError(ui.inputs.sumN, ui.errors.sum, `💡 Simplemente suma los numeradores equivalentes: <b>${prob.newN1} + ${prob.newN2}</b>.`);
    }
}

// PASO 4: Simplificar
function checkSimp() {
    const vN = parseInt(ui.inputs.simpN.value);
    const vD = parseInt(ui.inputs.simpD.value);
    let isOk = true;

    if (vN !== prob.finalN || vD !== prob.finalD) {
        if (vN !== prob.finalN) {
            showError(ui.inputs.simpN, ui.errors.simp, `💡 Numerador incorrecto. Divide <b>${prob.sumN} ÷ ${prob.gcd}</b>.`);
        } else {
            setSuccess(ui.inputs.simpN);
            showError(ui.inputs.simpD, ui.errors.simp, `💡 Denominador incorrecto. Divide <b>${prob.lcm} ÷ ${prob.gcd}</b>.`);
        }
        isOk = false;
    }

    if (isOk) {
        playSound('success');
        setSuccess(ui.inputs.simpN);
        setSuccess(ui.inputs.simpD);
        ui.errors.simp.style.display = 'none';
        ui.btns.simp.style.display = 'none';

        ui.displayFinalN.textContent = prob.finalN;
        ui.displayFinalD.textContent = prob.finalD;
        ui.simpFinalDisplay.classList.remove('hidden');

        renderPizza(ui.pizza3Container, prob.finalN, prob.finalD, 1, 'combined');
        updateMixedDisplay(prob.finalN, prob.finalD, 'final');

        score += 5;
        localStorage.setItem('pizza_fraction_score', score);
        document.getElementById('score-display').textContent = score;

        setTimeout(() => {
            showStep(5);
            playSound('victory');
            launchConfetti();
        }, 400);
    }
}

// Lanzar Confeti
function launchConfetti() {
    confetti({
        particleCount: 150,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#f59e0b', '#dc2626', '#10b981', '#ec4899']
    });
}

// --- ASIGNACIÓN DE EVENTOS ---
ui.btns.mcm.addEventListener('click', checkMCM);
ui.btns.eq.addEventListener('click', checkEQ);
ui.btns.sum.addEventListener('click', checkSum);
ui.btns.simp.addEventListener('click', checkSimp);

ui.inputs.mcm.addEventListener('keypress', e => { if (e.key === 'Enter') checkMCM(); });
ui.inputs.eqN1.addEventListener('keypress', e => { if (e.key === 'Enter') ui.inputs.eqN2.focus(); });
ui.inputs.eqN2.addEventListener('keypress', e => { if (e.key === 'Enter') checkEQ(); });
ui.inputs.sumN.addEventListener('keypress', e => { if (e.key === 'Enter') checkSum(); });
ui.inputs.simpN.addEventListener('keypress', e => { if (e.key === 'Enter') ui.inputs.simpD.focus(); });
ui.inputs.simpD.addEventListener('keypress', e => { if (e.key === 'Enter') checkSimp(); });

// Inicialización de marcador global e inicio de la primera partida
document.getElementById('score-display').textContent = score;
document.getElementById('streak-display').textContent = streak;

// Hacer funciones accesibles de forma global para eventos onclick en HTML
window.initGame = initGame;
window.toggleHelpModal = toggleHelpModal;

// Iniciar el juego
window.onload = () => {
    initGame();
};
