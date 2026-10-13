import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { RisultatoCalcoloGiornaliero } from '@/services/BustaPagaService';

// Usa un blu scuro per un look professionale
const themeBlue = '#0d47a1';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 30,
    paddingHorizontal: 40,
    paddingBottom: 60, // Aumenta lo spazio in fondo
    color: '#333333',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: themeBlue,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 22,
    color: themeBlue,
    fontFamily: 'Helvetica-Bold',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#444444',
    marginTop: 4,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
    backgroundColor: themeBlue,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  table: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#F1F1F1',
    borderBottomColor: '#BDBDBD',
  },
  colHeaderLabel: { width: '70%', fontFamily: 'Helvetica-Bold', padding: 5 },
  colHeaderValue: { width: '30%', fontFamily: 'Helvetica-Bold', padding: 5, textAlign: 'right' },
  colLabel: { width: '70%', padding: 5 },
  colValue: { width: '30%', padding: 5, fontFamily: 'Helvetica', textAlign: 'right' },
  summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
  },
  summaryBox: {
      width: '48%',
      borderWidth: 1,
      borderColor: themeBlue,
      borderRadius: 3,
      padding: 8,
      marginBottom: 10,
  },
  summaryTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: themeBlue,
  },
  summaryValue: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'right',
      color: '#333333',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: 'grey',
    fontSize: 8,
  }
});

// Definiamo qui le sezioni per usarle sia nella pagina che nel PDF
export const sezioniRiepilogo = [
    { titolo: 'Lavoro Ordinario', voci: [{ id: 'pagaBaseOre', label: 'Ordinarie Diurne' }, { id: 'oreNotturnoSeraleOrd', label: 'Notturno Ordinario (20-22)' }, { id: 'oreNotturnoPienoOrd', label: 'Notturno Ordinario (22-06)' } ]},
    { titolo: 'Lavoro Straordinario', voci: [ { id: 'strDiu12Intero', label: 'Straordinario Feriale (<2h)' }, { id: 'strDiuSuccessIntero', label: 'Straordinario Feriale (>2h)' }, { id: 'straordinarioSabatoDiurno50', label: 'Straordinario Sabato' }, { id: 'straordinarioNotturno50', label: 'Straordinario Notturno' }, { id: 'straordinarioFestivo55', label: 'Straordinario Festivo' }, { id: 'straordinarioNotturnoFestivo75', label: 'Straordinario Notturno Festivo' } ]},
    { titolo: 'Assenze e Altro', voci: [ { id: 'ferieScalate', label: 'Ferie' }, { id: 'rolScalati', label: 'ROL' }, { id: 'malattiaOre', label: 'Malattia' }, { id: 'anomaliaDebitoUncovered', label: 'Debito non coperto' } ]}
];

interface RiepilogoPDFProps {
  risultati: RisultatoCalcoloGiornaliero[];
  dipendenteNome: string;
  periodo: string;
}

export const RiepilogoPDF: React.FC<RiepilogoPDFProps> = ({ risultati, dipendenteNome, periodo }) => {

    const totali = sezioniRiepilogo.flatMap(s => s.voci).reduce((acc, voce) => {
        acc[voce.id] = risultati.reduce((sum, giorno) => sum + (giorno[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0), 0);
        return acc;
    }, {} as {[key: string]: number});

    const oreLavorate = totali.pagaBaseOre + totali.oreNotturnoSeraleOrd + totali.oreNotturnoPienoOrd + totali.strDiu12Intero + totali.strDiuSuccessIntero + totali.straordinarioSabatoDiurno50 + totali.straordinarioNotturno50 + totali.straordinarioFestivo55 + totali.straordinarioNotturnoFestivo75;
    const oreAssenza = totali.ferieScalate + totali.rolScalati + totali.malattiaOre;

    return (
        <Document title={`Riepilogo Ore - ${dipendenteNome} - ${periodo}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Riepilogo Ore Mensile</Text>
                    <Text style={styles.headerSubtitle}>Dipendente: {dipendenteNome}   |   Periodo: {periodo}</Text>
                </View>

                <View style={styles.summaryGrid}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryTitle}>ORE LAVORATE</Text>
                        <Text style={styles.summaryValue}>{oreLavorate.toFixed(2)}</Text>
                    </View>
                     <View style={styles.summaryBox}>
                        <Text style={styles.summaryTitle}>ORE ASSENZA RETRIBUITA</Text>
                        <Text style={styles.summaryValue}>{oreAssenza.toFixed(2)}</Text>
                    </View>
                </View>

                {sezioniRiepilogo.map(sezione => {
                    const sectionHasData = sezione.voci.some(v => totali[v.id] > 0);
                    if (!sectionHasData) return null;

                    return (
                        <View key={sezione.titolo} style={styles.section}>
                            <Text style={styles.sectionTitle}>{sezione.titolo}</Text>
                            <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                    <Text style={styles.colHeaderLabel}>Voce di Paga</Text>
                                    <Text style={styles.colHeaderValue}>Ore nel mese</Text>
                                </View>
                                {sezione.voci.map(voce => (
                                    totali[voce.id] > 0 && (
                                        <View key={voce.id} style={styles.tableRow}>
                                            <Text style={styles.colLabel}>{voce.label}</Text>
                                            <Text style={styles.colValue}>{totali[voce.id].toFixed(2)}</Text>
                                        </View>
                                    )
                                ))}
                            </View>
                        </View>
                    )
                })}
                
                <Text style={styles.footer}>
                    Documento generato automaticamente. I dati si basano sui rapportini di intervento inseriti nell'applicazione.
                </Text>

            </Page>
        </Document>
    );
};