from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import RequestFactory, TestCase

import core.urls as core_urls


class SpaFallbackTests(TestCase):
    def test_serves_dist_static_file_and_falls_back_to_index(self):
        with TemporaryDirectory() as tmpdir:
            parent = Path(tmpdir)
            root = parent / 'dist'
            root.mkdir()
            (root / 'banners').mkdir()
            (parent / 'secret.txt').write_text('TOP_SECRET', encoding='utf-8')
            (root / 'index.html').write_text('<html>SPA</html>', encoding='utf-8')
            (root / 'product-placeholder.svg').write_text('<svg>ok</svg>', encoding='utf-8')
            (root / 'banners' / 'hero.png').write_bytes(b'PNGDATA')

            with patch.object(core_urls, 'dist_dir', root):
                svg_res = self.client.get('/product-placeholder.svg')
                self.assertEqual(svg_res.status_code, 200)
                self.assertEqual(b''.join(svg_res.streaming_content), b'<svg>ok</svg>')
                svg_res.close()

                banner_res = self.client.get('/banners/hero.png')
                self.assertEqual(banner_res.status_code, 200)
                self.assertEqual(b''.join(banner_res.streaming_content), b'PNGDATA')
                banner_res.close()

                route_res = self.client.get('/products/42')
                self.assertEqual(route_res.status_code, 200)
                self.assertEqual(b''.join(route_res.streaming_content), b'<html>SPA</html>')
                route_res.close()

                # Path traversal must fall back to SPA index rather than leaking parent files
                req = RequestFactory().get('/../secret.txt')
                trav_res = core_urls.spa_fallback(req, path='../secret.txt')
                self.assertEqual(trav_res.status_code, 200)
                self.assertEqual(b''.join(trav_res.streaming_content), b'<html>SPA</html>')
                trav_res.close()
