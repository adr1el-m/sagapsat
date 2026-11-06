import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
import build

class EvidenceTests(unittest.TestCase):
    def test_deduplication_trailing_bytes_and_withheld_overlays(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);source=root/'source';capture=source/'2026-11-05_Meteor-M2-4';capture.mkdir(parents=True)
            frame=b'\x1a\xcf\xfc\x1d'+b'x'*1020
            (capture/'meteor_m2-x_lrpt.cadu').write_bytes(frame+frame+b'broken')
            Image.new('RGB',(12,8)).save(capture/'image.png')
            Image.new('RGB',(12,8)).save(capture/'image_map.png')
            (capture/'capture-result.json').write_text(json.dumps(dict(cadu_bytes=2054,images=['image.png','image_map.png','../outside.png'],folder='/decoded/2026-11-05_06-52_meteor',exit_code=0)))
            before=build.digest(capture/'meteor_m2-x_lrpt.cadu')
            data=build.archive(source,root/'out');c=data['captures'][0]
            self.assertEqual((c['frames'],c['unique_frames'],c['sync_frames'],c['trailing_bytes']),(2,1,2,6))
            self.assertEqual(len(c['images']),1)
            self.assertEqual(c['outcome'],'partial')
            self.assertEqual(before,build.digest(capture/'meteor_m2-x_lrpt.cadu'))
            for f in c['evidence']:
                from urllib.parse import unquote
                self.assertEqual(f['sha256'],build.digest(root/'out'/unquote(f['url'])))

    def test_stale_tles_withhold_predictions(self):
        lines=['METEOR-M2 3','1 57166U 23091A   26308.97389280 -.00000016  00000+0  11856-4 0  9997','2 57166  98.5913   0.9432 0004978 115.3899 244.7796 14.24055525174558']
        with patch.object(build,'get_tle',return_value=(lines,'fixture',None)):
            o=build.orbits(Path('/unused'),now=dt.datetime(2026,12,6,tzinfo=dt.timezone.utc))
        self.assertFalse(o['passes']);self.assertFalse(o['satellites']);self.assertEqual(len(o['errors']),2)

    def test_actual_manifest_files_and_frame_totals(self):
        out=build.ROOT/'dist';manifest=json.loads((out/'archive.json').read_text())
        from urllib.parse import unquote
        for c in manifest['captures']:
            with self.subTest(capture=c['id']):
                self.assertTrue(c['size_matches_report'])
                self.assertEqual(c['trailing_bytes'],0)
                self.assertEqual(c['frames'],c['sync_frames'])
                self.assertGreater(c['unique_frames'],0)
                for f in c['images']+c['evidence']:
                    self.assertEqual(f['sha256'],build.digest(out/unquote(f['url'])))
        o=json.loads((out/'orbits.json').read_text())
        self.assertFalse(o['errors'])
        for p in o['passes']:
            self.assertLess(p['aos'],p['peak']);self.assertLess(p['peak'],p['los'])
            self.assertGreaterEqual(p['max_elevation'],10)
            self.assertGreater(p['duration_seconds'],0)

if __name__=='__main__':unittest.main()
