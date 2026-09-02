import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { EnrichedRapportino, Ditta } from '@/models/definitions';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// --- Stili per il documento PDF ---
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#cccccc',
        paddingBottom: 10,
    },
    headerLeft: {
        // Se avessimo un logo:
        // width: 50,
        // height: 50,
    },
    headerCenter: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
    },
    headerRight: {
        textAlign: 'right',
        fontSize: 8,
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#cccccc',
        paddingBottom: 2,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 3,
    },
    label: {
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        width: 120,
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfbfbf',
        marginTop: 10,
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableColHeader: {
        width: '20%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfbfbf',
        backgroundColor: '#f2f2f2',
        padding: 5,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
    },
    tableCol: {
        width: '20%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfbfbf',
        padding: 5,
    },
    signatureSection: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBox: {
        width: '45%',
        textAlign: 'center',
    },
    signatureImage: {
        width: 150,
        height: 75,
        border: '1px solid #000',
        alignSelf: 'center',
        marginBottom: 5,
    },
    signatureLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        marginTop: 40,
        marginBottom: 5,
    },
    footer: {
        position: 'absolute',
        bottom: 15,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: 'grey',
    },
});

interface ReportPDFProps {
    report: EnrichedRapportino;
    ditta?: Ditta; // Aggiungo la ditta come prop opzionale
}

// Type guard to safely check if a value is a Firestore Timestamp
const isTimestamp = (value: unknown): value is Timestamp => {
    return !!value && typeof (value as Timestamp).toDate === 'function';
};

const ReportPDF: React.FC<ReportPDFProps> = ({ report, ditta }) => {
    // Safely convert Timestamp to Date if necessary
    const dateToFormat = isTimestamp(report.data) ? report.data.toDate() : report.data;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* --- INTESTAZIONE --- */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {/* Il nome della ditta viene ora passato come prop */}
                        <Text>{ditta?.nome || 'Tecnologie Elettriche Marine'}</Text>
                    </View>
                    <Text style={styles.headerCenter}>RAPPORTO DI INTERVENTO TECNICO</Text>
                    <View style={styles.headerRight}>
                        <Text>ID: {report.id}</Text>
                        <Text>Data: {report.createdAt ? format(report.createdAt, 'dd/MM/yyyy HH:mm') : 'N/A'}</Text>
                    </View>
                </View>

                {/* --- SEZIONE INFO GENERALI --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dettagli Intervento</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Data Intervento:</Text>
                        <Text>{format(dateToFormat, 'eeee dd MMMM yyyy')}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nave/Cliente:</Text>
                        <Text>{report.naveNome || 'N/D'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Veicolo:</Text>
                        <Text>{report.veicolo?.nome || 'N/D'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Luogo:</Text>
                        <Text>{report.luogoNome || 'N/D'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Descrizione:</Text>
                        <Text>{report.descrizioneBreve || 'Nessuna descrizione'}</Text>
                    </View>
                </View>

                {/* --- SEZIONE PERSONALE E ORE --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personale Tecnico e Dettaglio Ore</Text>
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableColHeader}>Tecnico</Text>
                            <Text style={styles.tableColHeader}>Inizio</Text>
                            <Text style={styles.tableColHeader}>Fine</Text>
                            <Text style={styles.tableColHeader}>Pausa</Text>
                            <Text style={styles.tableColHeader}>Ore</Text>
                        </View>
                        {report.dettaglioOreTecnici?.map((tech, index) => (
                            <View style={styles.tableRow} key={index}>
                                <Text style={styles.tableCol}>{tech.nome || `Tecnico ${index + 1}`}</Text>
                                <Text style={styles.tableCol}>{tech.oraInizio}</Text>
                                <Text style={styles.tableCol}>{tech.oraFine}</Text>
                                <Text style={styles.tableCol}>{tech.pausa} min</Text>
                                <Text style={styles.tableCol}>{tech.ore.toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={[styles.row, { marginTop: 10 }]}>
                        <Text style={styles.label}>Tipo Giornata:</Text>
                        <Text>{report.tipoGiornata?.nome || 'N/D'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Ore Totali (per tecnico):</Text>
                        <Text>{(report.oreGiorno || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Trasferta:</Text>
                        <Text>{report.trasfertaId ? 'Sì' : 'No'}</Text>
                    </View>
                </View>

                {/* --- SEZIONE LAVORI E MATERIALI --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lavoro Eseguito</Text>
                    <Text>{report.lavoroEseguito || 'Nessun dettaglio'}</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Materiali Impiegati</Text>
                    <Text>{report.materialiImpiegati || 'Nessun materiale'}</Text>
                </View>

                {/* --- SEZIONE FIRMA --- */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}></View>
                    <View style={styles.signatureBox}>
                        <Text>Firma del Responsabile:</Text>
                        {report.firmaVettoriale ?
                            <Image style={styles.signatureImage} src={report.firmaVettoriale} />
                            : <View style={styles.signatureLine} />
                        }
                        <Text>{report.firmaFirmatarioNome || '____________________'}</Text>
                        <Text>({report.firmaFirmatarioSocieta || '____________________'})</Text>
                    </View>
                </View>


                {/* --- PIÈ DI PAGINA --- */}
                <Text style={styles.footer} fixed>
                    R.I.S.O. App - Report generato il {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </Text>
            </Page>
        </Document>
    )
};

export default ReportPDF;
