import datetime as dt,json,tempfile,unittest
from pathlib import Path
from analysis import timeline,coverage

class QualityTests(unittest.TestCase):
    def test_log_gaps_and_nosync_are_not_interpolated_into_lock(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)
            (p/'native-reception.log').write_text('[06:30:00 - 06/11/2026] SNR : 4.0dB\n[06:30:00 - 06/11/2026] Deframer : SYNCED BER : 0.1\n[06:32:00 - 06/11/2026] Deframer : NOSYNC BER : 0.4\n')
            x=timeline(p)
            self.assertEqual(x['lock_samples'],2);self.assertEqual(x['locked_samples'],1)
            self.assertEqual(len(x['samples']),2)
    def test_invalid_scan_dates_withhold_geographic_placement(self):
        import cbor2
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);f=p/'final_images/MSU-MR';f.mkdir(parents=True)
            (f/'product.cbor').write_bytes(cbor2.dumps({'images':[{'timestamps':[1700000000,1700000001,1700000002]}]}))
            r=coverage(p,'2026-11-06T06:30:00+00:00','2026-11-06T06:50:00+00:00')
            self.assertEqual(r['status'],'unverified');self.assertFalse(r['track'])
    def test_nonmonotonic_scan_times_are_rejected(self):
        import cbor2
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);f=p/'final_images/MSU-MR';f.mkdir(parents=True)
            (f/'product.cbor').write_bytes(cbor2.dumps({'images':[{'timestamps':[1793946771,1793946770,1793946773]}]}))
            r=coverage(p,'2026-11-06T06:30:00+00:00','2026-11-06T06:50:00+00:00')
            self.assertEqual(r['status'],'unverified');self.assertFalse(r['track'])

if __name__=='__main__':unittest.main()
