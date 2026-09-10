import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { RiepilogoMese, EnrichedRapportino, VoceRiepilogo } from '@/models/definitions';
import { toDateSafe as toDate } from '@/lib/date-utils';

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#fff', padding: 30, fontSize: 10 },
  header: { marginBottom: 20, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { margin: 'auto', flexDirection: 'row' },
  tableColHeader: { width: '14%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 5, fontWeight: 'bold' },
  tableCol: { width: '14%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
  tableCellHeader: { margin: 'auto', marginTop: 5, fontSize: 9, fontWeight: 'bold' },
  tableCell: { margin: 'auto', marginTop: 5, fontSize: 9 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8 },
});

const GeneratedReportView = ({ riepilogo, rapportini, meseSelezionato }: { riepilogo: RiepilogoMese, rapportini: EnrichedRapportino[], meseSelezionato: Date }) => {

    const getDescrizionePerGiorno = (giorno: string): string => {
        return rapportini
            .filter(r => {
                const d = toDate(r.data);
                return d ? format(d, 'yyyy-MM-dd') === giorno : false;
            })
            .map(r => r.naveNome || r.luogoNome)
            .filter(Boolean)
            .join(', ') || 'N/D';
    };

    const vociDaVisualizzare = Array.from(riepilogo.dettaglio.values())
                                    .filter(d => (d.valore > 0))
                                    .sort((a, b) => {
                                        if(a.tipoId === 't_ordinaria') return -1;
                                        if(b.tipoId === 't_ordinaria') return 1;
                                        if(a.tipoId === 't_straordinaria') return -1;
                                        if(b.tipoId === 't_straordinaria') return 1;
                                        return a.nome.localeCompare(b.nome);
                                    });

    const giorniUnici = [...new Set(rapportini.map(r => {
        const d = toDate(r.data);
        return d ? format(d, 'yyyy-MM-dd') : null;
    }))].filter(Boolean).sort() as string[];

    return (
        <Document>
            <Page size="A4" style={styles.page} orientation="landscape">
                <Text style={styles.header}>Riepilogo Attività - {format(meseSelezionato, 'MMMM yyyy', { locale: it })}</Text>
                
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableRow}>
                        <View style={{...styles.tableColHeader, width: '10%'}}><Text style={styles.tableCellHeader}>Data</Text></View>
                        <View style={{...styles.tableColHeader, width: '20%'}}><Text style={styles.tableCellHeader}>Descrizione</Text></View>
                        {vociDaVisualizzare.map(voce => (
                            <View key={voce.tipoId} style={{...styles.tableColHeader, width: `${70 / vociDaVisualizzare.length}%`}}>
                                <Text style={styles.tableCellHeader}>{voce.nome}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Table Body */}
                    {giorniUnici.map(giorno => (
                        <View key={giorno} style={styles.tableRow}>
                            <View style={{...styles.tableCol, width: '10%'}}><Text style={styles.tableCell}>{format(new Date(giorno), 'dd/MM (eee)', { locale: it })}</Text></View>
                            <View style={{...styles.tableCol, width: '20%'}}><Text style={styles.tableCell}>{getDescrizionePerGiorno(giorno)}</Text></View>
                            {vociDaVisualizzare.map(voce => {
                                const oreDelGiorno = rapportini
                                    .filter(r => {
                                        const d = toDate(r.data);
                                        const tipoIdCorrisponde = r.tipoGiornataId === voce.tipoId || (voce.tipoId === 't_straordinaria' && r.oreGiorno > 8 && r.tipoGiornataId === 't_ordinaria');
                                        return d ? format(d, 'yyyy-MM-dd') === giorno && tipoIdCorrisponde : false;
                                    })
                                    .reduce((sum, r) => {
                                        if(voce.tipoId === 't_ordinaria') return Math.min(r.oreGiorno, 8);
                                        if(voce.tipoId === 't_straordinaria') {
                                            if (r.tipoGiornataId === 't_straordinaria') return sum + r.oreGiorno;
                                            if (r.tipoGiornataId === 't_ordinaria') return sum + Math.max(0, r.oreGiorno - 8);
                                        }
                                        return sum + r.oreGiorno
                                    }, 0);

                                let valoreCella = '-';
                                if (voce.unita === 'g') {
                                     const haTrasferta = rapportini.some(r => {
                                        const d = toDate(r.data);
                                        return d ? format(d, 'yyyy-MM-dd') === giorno && r.trasfertaId === voce.tipoId : false;
                                     });
                                     if(haTrasferta) valoreCella = '1';
                                } else {
                                    if (oreDelGiorno > 0) valoreCella = oreDelGiorno.toFixed(2);
                                }

                                return (
                                    <View key={voce.tipoId} style={{...styles.tableCol, width: `${70 / vociDaVisualizzare.length}%`}}>
                                        <Text style={styles.tableCell}>{valoreCella}</Text>
                                    </View>
                                )
                            })}
                        </View>
                    ))}

                    {/* Table Footer */}
                    <View style={styles.tableRow}>
                        <View style={{...styles.tableColHeader, width: '30%'}}><Text style={styles.tableCellHeader}>TOTALI</Text></View>
                        {vociDaVisualizzare.map(voce => (
                            <View key={voce.tipoId} style={{...styles.tableColHeader, width: `${70 / vociDaVisualizzare.length}%`}}>
                                <Text style={styles.tableCellHeader}>{(voce.valore).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={styles.footer}>Documento generato automaticamente.</Text>
            </Page>
        </Document>
    );
};

export default GeneratedReportView;
