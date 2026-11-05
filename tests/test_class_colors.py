"""Class-color setup: selection parsing and per-class database writes."""
import importlib.util
import json
import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('class_color_setup.configure', ROOT / 'scripts/configure_class_colors.py')
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


def make_db(directory):
    path = Path(directory) / 'assignments.sqlite3'
    db = sqlite3.connect(str(path))
    db.execute('CREATE TABLE assignments (source TEXT)')
    for course, course_id in [('Chemistry', '2'), ('Philosophy', '3')]:
        db.execute('INSERT INTO assignments VALUES (?)',
                   (json.dumps({'course': course, 'courseId': course_id}),))
    db.commit()
    db.close()
    return path


class ConfigureClassColorsTests(unittest.TestCase):
    def test_google_colors_hex_and_keywords_parse(self):
        self.assertEqual(setup.parse_selection(''), ('keep', None))
        self.assertEqual(setup.parse_selection('Basil'), ('color', '#0b8043'))
        self.assertEqual(setup.parse_selection('peacock'), ('color', '#039be5'))
        self.assertEqual(setup.parse_selection('10'), ('color', '#0b8043'))
        self.assertEqual(setup.parse_selection('#7986CB'), ('color', '#7986cb'))
        self.assertEqual(setup.parse_selection('f6bf26'), ('color', '#f6bf26'))
        self.assertEqual(setup.parse_selection('default'), ('clear', None))
        self.assertEqual(setup.parse_selection('Cocoa'), ('color', '#795548'))
        with self.assertRaises(ValueError):
            setup.parse_selection('not a color')
        with self.assertRaises(ValueError):
            setup.parse_selection('#12345')

    def test_courses_list_with_current_colors_and_choices_apply(self):
        with tempfile.TemporaryDirectory(prefix='canvas-class-colors-') as directory:
            db_path = make_db(directory)
            courses = setup.load_courses(db_path)
            self.assertEqual([(c, i) for c, i, _, _ in courses], [('Chemistry', '2'), ('Philosophy', '3')])
            groups = {c: g for c, _, g, _ in courses}
            setup.apply_choices(db_path, [(groups['Chemistry'], '#d50000')])
            db = sqlite3.connect(str(db_path))
            try:
                rows = dict(db.execute('SELECT class_group, color FROM course_colors'))
            finally:
                db.close()
            self.assertEqual(rows[groups['Chemistry']], '#d50000')
            self.assertNotIn(groups['Philosophy'], rows)
            setup.apply_choices(db_path, [(groups['Chemistry'], None)])
            db = sqlite3.connect(str(db_path))
            try:
                rows = dict(db.execute('SELECT class_group, color FROM course_colors'))
            finally:
                db.close()
            self.assertNotIn(groups['Chemistry'], rows)

    def test_set_mode_matches_exact_class_names(self):
        with tempfile.TemporaryDirectory(prefix='canvas-class-colors-') as directory:
            db_path = make_db(directory)
            with patch.object(setup, 'database_path', return_value=db_path):
                self.assertEqual(setup.main(['--set', 'Chemistry=Tomato']), 0)
                courses = setup.load_courses(db_path)
                current = {c: color for c, _, _, color in courses}
                self.assertEqual(current['Chemistry'], '#d50000')
                self.assertNotEqual(current['Philosophy'], '#d50000')
                self.assertEqual(setup.main(['--set', 'Chem=#7986cb']), 2)

    def test_missing_database_explains_itself(self):
        with tempfile.TemporaryDirectory(prefix='canvas-class-colors-') as directory:
            missing = Path(directory) / 'assignments.sqlite3'
            with patch.object(setup, 'database_path', return_value=missing):
                self.assertEqual(setup.main(['--list']), 1)


if __name__ == '__main__':
    unittest.main()
