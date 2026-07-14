const fs = require('fs');
let code = fs.readFileSync('MatchesPage.tsx', 'utf-8');

// 1. Aggiungi gli stati
const stateAnchor = "const [showGironiCompleteSuccess, setShowGironiCompleteSuccess] = useState(false);";
const stateNew = `const [showGironiCompleteSuccess, setShowGironiCompleteSuccess] = useState(false);

    // Nuovi stati per conferme e successi (Salvataggio Parziale e Conferma Chiusura Fasi)
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    const [proceedConfirmData, setProceedConfirmData] = useState<{ isOpen: boolean; title: string; message: string; actionText: string; onConfirm: () => void }>({ isOpen: false, title: "", message: "", actionText: "", onConfirm: () => {} });`;
code = code.replace(stateAnchor, stateNew);

// 2. submitEditScores rename and onlySave
code = code.replace(
    "const handleEditScoresSubmit = async (e: React.FormEvent) => {\n        e.preventDefault();",
    "const submitEditScores = async (e?: React.FormEvent | null, onlySave: boolean = false) => {\n        if (e) e.preventDefault();"
);
code = code.replace(
    "console.log(`💾 [handleEditScoresSubmit] Saving ${matchUpdates.length} match updates:`, matchUpdates.map(u => ({",
    "console.log(`💾 [submitEditScores] Saving ${matchUpdates.length} match updates:`, matchUpdates.map(u => ({"
);
code = code.replace(
    "await updateTournamentMatches(matchUpdates, true);\n\n        // ====== CAPTURE INITIAL PHASE MATCHES BEFORE CASCADE ======",
    "await updateTournamentMatches(matchUpdates, true);\n\n        // Se l'utente ha richiesto solo un salvataggio parziale (es. durante la fase a gironi/box/ecc)\n        if (onlySave) {\n            await fetchData(); // Assicura che i match siano aggiornati localmente\n            setEditingTournament(null);\n            setShowSaveSuccess(true);\n            return; // Interrompe il flusso senza generare le fasi successive\n        }\n\n        // ====== CAPTURE INITIAL PHASE MATCHES BEFORE CASCADE ======"
);

// 3. Form onSubmit update
code = code.replace(
    '<form onSubmit={handleEditScoresSubmit} className="px-4 pb-4 pt-2">',
    '<form onSubmit={(e) => submitEditScores(e, false)} className="px-4 pb-4 pt-2">'
);

// 4. Form buttons update
const oldFormButtons = `<div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="button" variant="secondary" onClick={() => {
                        setEditingTournament(null);
                        setIsInFinalsPhase(false);
                        setShowGironiStandingsModal(false);
                        setIsInGironiSemifinalsPhase(false);
                        setIsInGironiFinalsPhase(false);
                    }} className="mr-2" disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvataggio...' : (
                            editingTournament?.status === 'scheduled' && editingTournament?.type === TournamentType.RoundRobinFinali
                                ? 'Calcola Classifica'
                                : editingTournament?.status === 'scheduled' && editingTournament?.type === TournamentType.BeatTheBox
                                    ? 'Calcola Qualificati'
                                    : editingTournament?.status === 'scheduled' && editingTournament?.type === TournamentType.GironiFaseFinale
                                        ? 'Calcola Semifinalisti'
                                        : editingTournament?.status === 'scheduled' 
                                            ? 'Completa Torneo' 
                                            : 'Salva Modifiche'
                        )}
                    </Button>
                </div>`;
const newFormButtons = `<div className="flex gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="button" variant="secondary" onClick={() => {
                        setEditingTournament(null);
                        setIsInFinalsPhase(false);
                        setShowGironiStandingsModal(false);
                        setIsInGironiSemifinalsPhase(false);
                        setIsInGironiFinalsPhase(false);
                    }} className="flex-1" disabled={isSubmitting}>Annulla</Button>
                    
                    {editingTournament?.status === 'scheduled' && (
                        <Button type="button" onClick={() => submitEditScores(null, true)} disabled={isSubmitting} className="flex-1">
                            {isSubmitting ? 'Salvataggio...' : 'Salva'}
                        </Button>
                    )}

                    <Button type="button" onClick={() => {
                        if (editingTournament?.status === 'completed') {
                            submitEditScores(null, false);
                            return;
                        }

                        let title = "Conferma";
                        let message = "Vuoi procedere?";
                        let actionText = "Procedi";
                        
                        if (editingTournament?.type === TournamentType.RoundRobinFinali) {
                            title = "Chiudi Round Robin";
                            message = "Hai inserito tutti i risultati? Vuoi calcolare le classifiche e procedere alla fase finale?";
                            actionText = "Calcola Classifica";
                        } else if (editingTournament?.type === TournamentType.BeatTheBox) {
                            title = "Chiudi Fase a Box";
                            message = "Confermi di voler chiudere la fase a Box e generare i tabelloni finali?";
                            actionText = "Calcola Qualificati";
                        } else if (editingTournament?.type === TournamentType.GironiFaseFinale) {
                            title = "Chiudi Gironi";
                            message = "Hai inserito tutti i risultati? Vuoi calcolare le classifiche e procedere alle semifinali?";
                            actionText = "Calcola Semifinalisti";
                        } else {
                            title = "Chiudi Giornata";
                            message = "Confermi di voler chiudere definitivamente la giornata? Gli ELO verranno aggiornati.";
                            actionText = "Completa Torneo";
                        }
                        
                        setProceedConfirmData({
                            isOpen: true,
                            title,
                            message,
                            actionText,
                            onConfirm: () => submitEditScores(null, false)
                        });
                    }} disabled={isSubmitting} className={editingTournament?.status === 'scheduled' ? "flex-1 !border-emerald-700/50 !bg-emerald-600 hover:!bg-emerald-700 !text-white dark:!border-emerald-300/35" : "flex-1"}>
                        {isSubmitting ? 'Salvataggio...' : (
                            editingTournament?.status === 'scheduled' && editingTournament?.type === TournamentType.RoundRobinFinali
                                ? 'Calcola Classifica'
                                : editingTournament?.status === 'scheduled' && editingTournament?.type === TournamentType.BeatTheBox
                                    ? 'Calcola Qualificati'
                                    : editingTournament?.status === 'scheduled' && editingTournament?.type === TournamentType.GironiFaseFinale
                                        ? 'Calcola Semifinalisti'
                                        : editingTournament?.status === 'scheduled' 
                                            ? 'Chiudi Giornata' 
                                            : 'Salva Modifiche'
                        )}
                    </Button>
                </div>`;
code = code.replace(oldFormButtons, newFormButtons);

// 5. PlayoffType per BeatTheBox
code = code.replace(
    'const { semifinals, finals } = createBeatBoxFinalsMatches(\n            numBoxes,\n            standings,\n            editingTournament.date\n        );',
    'const { semifinals, finals } = createBeatBoxFinalsMatches(\n            numBoxes,\n            standings,\n            editingTournament.date,\n            editingTournament.playoffType || \'semifinals\'\n        );'
);

// 6. Round Robin final button
const rrFinalsBtn = `<Button 
                            onClick={handleCompleteTournamentWithFinals}
                            className="flex-1"
                            disabled={isSubmitting || Object.keys(finalsScores).length !== finalsMatches.length}
                        >
                            {isSubmitting ? 'Finalizzando...' : 'Finalizza Torneo'}
                        </Button>`;
const newRrFinalsBtn = `<Button 
                            onClick={() => {
                                setProceedConfirmData({
                                    isOpen: true,
                                    title: "Completa Torneo",
                                    message: "Confermi di voler completare il torneo? Gli ELO verranno aggiornati definitivamente.",
                                    actionText: "Finalizza Torneo",
                                    onConfirm: handleCompleteTournamentWithFinals
                                });
                            }}
                            className="flex-1 !border-emerald-700/50 !bg-emerald-600 hover:!bg-emerald-700 !text-white dark:!border-emerald-300/35"
                            disabled={isSubmitting || Object.keys(finalsScores).length !== finalsMatches.length}
                        >
                            {isSubmitting ? 'Finalizzando...' : 'Finalizza Torneo'}
                        </Button>`;
code = code.replace(rrFinalsBtn, newRrFinalsBtn);

// 7. Beat the box final button
const btbFinalsBtn = `<Button 
                            onClick={handleCompleteBeatBoxTournament} 
                            disabled={isSubmitting} 
                            className="flex-1"
                        >
                            {isSubmitting ? 'Salvataggio...' : 'Conferma e Salva'}
                        </Button>`;
const newBtbFinalsBtn = `<Button 
                            onClick={() => {
                                setProceedConfirmData({
                                    isOpen: true,
                                    title: "Completa Torneo",
                                    message: "Confermi di voler completare il torneo? Gli ELO verranno aggiornati definitivamente.",
                                    actionText: "Finalizza Torneo",
                                    onConfirm: handleCompleteBeatBoxTournament
                                });
                            }} 
                            disabled={isSubmitting} 
                            className="flex-1 !border-emerald-700/50 !bg-emerald-600 hover:!bg-emerald-700 !text-white dark:!border-emerald-300/35"
                        >
                            {isSubmitting ? 'Salvataggio...' : 'Conferma e Salva'}
                        </Button>`;
code = code.replace(btbFinalsBtn, newBtbFinalsBtn);

// 8. Gironi final button logic + handleCompleteGironiTournament
const gironiInlineFuncRegex = /onClick=\{async \(\) => \{\n\s*const allComplete = gironiFinalMatches\.every\(m => m\.winner\);[\s\S]*?className="flex-1"\n\s*disabled=\{isSubmitting\}\n\s*>\n\s*\{isSubmitting \? 'Salvataggio\.\.\.' : 'Conferma e Salva'\}\n\s*<\/Button>/;

const gironiNewCode = `onClick={() => {
                            const allComplete = gironiFinalMatches.every(m => m.winner);
                            if (!allComplete) {
                                alert('⚠️ Inserisci i risultati di tutte le finali');
                                return;
                            }
                            setProceedConfirmData({
                                isOpen: true,
                                title: "Completa Torneo",
                                message: "Confermi di voler completare il torneo? Gli ELO verranno aggiornati definitivamente.",
                                actionText: "Finalizza Torneo",
                                onConfirm: async () => {
                                    const tournament = finalsFlowTournament;
                                    if (!tournament) return;
                                    setIsSubmitting(true);
                                    try {
                                        const allNewMatches = [...gironiSemifinalMatches, ...gironiFinalMatches];
                                        for (const match of allNewMatches) {
                                            const res = await fetch('/api/matches', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ ...match, tournamentId: tournament.id })
                                            });
                                            if(!res.ok) throw new Error('Failed to save match');
                                        }
                                        const compRes = await fetch('/api/tournaments/complete', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ tournamentId: tournament.id })
                                        });
                                        if(!compRes.ok) throw new Error('Failed to complete tournament');
                                        
                                        setEditingTournament(null);
                                        setFinalsFlowTournament(null);
                                        setIsInGironiFinalsPhase(false);
                                        setIsInGironiSemifinalsPhase(false);
                                        setGironiFinalMatches([]);
                                        setGironiSemifinalMatches([]);
                                        setGironiStandings([]);
                                        setShowGironiStandingsModal(false);
                                        window.location.reload();
                                    } catch (e) {
                                        alert('Errore.');
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }
                            });
                        }}
                        className="flex-1 !border-emerald-700/50 !bg-emerald-600 hover:!bg-emerald-700 !text-white dark:!border-emerald-300/35"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Salvataggio...' : 'Conferma e Salva'}
                    </Button>`;

code = code.replace(gironiInlineFuncRegex, gironiNewCode);


// 9. Aggiungi i Popups prima di chiudere
const alertsAnchor = '<HIGAlert';
const popups = `            {/* Nuovi popup per conferme e successi */}
            <HIGSheet 
                isOpen={proceedConfirmData.isOpen} 
                onClose={() => setProceedConfirmData(prev => ({ ...prev, isOpen: false }))} 
                title={proceedConfirmData.title}
            >
                <div className="p-4 space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">{proceedConfirmData.message}</p>
                    <div className="flex gap-3 justify-end pt-2">
                        <Button variant="secondary" onClick={() => setProceedConfirmData(prev => ({ ...prev, isOpen: false }))}>
                            Annulla
                        </Button>
                        <Button className="!border-emerald-700/50 !bg-emerald-600 hover:!bg-emerald-700 !text-white dark:!border-emerald-300/35" onClick={() => {
                            setProceedConfirmData(prev => ({ ...prev, isOpen: false }));
                            proceedConfirmData.onConfirm();
                        }}>
                            {proceedConfirmData.actionText}
                        </Button>
                    </div>
                </div>
            </HIGSheet>

            <HIGSheet
                isOpen={showSaveSuccess}
                onClose={() => setShowSaveSuccess(false)}
                title="✅ Operazione Completata"
            >
                <div className="p-4 space-y-4 text-center">
                    <p className="text-gray-700 dark:text-gray-300 text-lg">Salvataggio Effettuato!</p>
                    <div className="flex justify-center pt-2">
                        <Button onClick={() => setShowSaveSuccess(false)} className="w-full max-w-xs">
                            OK
                        </Button>
                    </div>
                </div>
            </HIGSheet>

            <HIGSheet
                isOpen={showDeleteSuccess}
                onClose={() => setShowDeleteSuccess(false)}
                title="🗑️ Operazione Completata"
            >
                <div className="p-4 space-y-4 text-center">
                    <p className="text-gray-700 dark:text-gray-300 text-lg">Cancellazione Effettuata!</p>
                    <div className="flex justify-center pt-2">
                        <Button onClick={() => setShowDeleteSuccess(false)} className="w-full max-w-xs">
                            OK
                        </Button>
                    </div>
                </div>
            </HIGSheet>

            <HIGAlert`;

code = code.replace(alertsAnchor, popups);

fs.writeFileSync('MatchesPage.tsx', code);
