"""Palette unit tests plus mocked installed-provider writes; no live Google access."""
import contextlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('color_unit.event_colors', ROOT / 'integrations/event_colors.py')
colors = importlib.util.module_from_spec(spec)
spec.loader.exec_module(colors)


class EventColorTests(unittest.TestCase):
    def test_palette_includes_legacy_colors_and_calendar_specific_labels(self):
        options = colors.palette([dict(id='label-pistachio',name='Pistachio',backgroundColor='#7cb342'),
                                  dict(id='invalid',name='Bad',backgroundColor='not a color')])
        self.assertEqual(len(options), 13)
        self.assertEqual(options[0]['value'], '')
        self.assertEqual(options[-1], dict(value='label:label-pistachio',label='Pistachio',color='#7cb342'))

    def test_color_fields_clear_superseding_labels_and_validate_calendar_membership(self):
        package = types.ModuleType('color_unit')
        package.google = types.SimpleNamespace(labels=lambda token, cal: {'pistachio':'#7cb342'})
        with patch.dict(sys.modules, color_unit=package):
            self.assertEqual(colors.fields('color:7','test','calendar'), {'colorId':'7','eventLabelId':''})
            self.assertEqual(colors.fields('','test','calendar'), {'colorId':None,'eventLabelId':''})
            self.assertEqual(colors.fields('label:pistachio','test','calendar'), {'colorId':None,'eventLabelId':'pistachio'})
            with self.assertRaises(ValueError):
                colors.fields('label:other-calendar-label','test','calendar')
            for value in ['#7cb342','color:999','label:../../evil',None]:
                with self.assertRaises(ValueError):
                    colors.validate(value)


PLUGINS = Path(os.environ.get('CANVAS_DESKTOP_PLUGIN_DIR', Path.home() / '.config/omarchy/plugins'))
OMCAL = PLUGINS / 'blacksheep.calendar/scripts'


@unittest.skipUnless((OMCAL / 'omcal/event_colors.py').is_file() and os.environ.get('CANVAS_SKIP_DESKTOP_TESTS') != '1', 'Installed event-color integration unavailable or desktop tests disabled')
class InstalledEventColorTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0,str(OMCAL))
        self.addCleanup(lambda: sys.path.remove(str(OMCAL)))
        from omcal import edit, sync, auth, google
        self.edit, self.sync, self.auth, self.google = edit,sync,auth,google
        preferred = Path('/tmp/opencode')
        temp = tempfile.TemporaryDirectory(prefix='canvas-events-',dir=preferred if preferred.is_dir() else None)
        self.addCleanup(temp.cleanup)
        self.cache = Path(temp.name)
        self.raw = dict(id='event',summary='Synthetic meeting',start={'dateTime':'2026-11-10T15:00:00Z'},
                        end={'dateTime':'2026-11-10T16:00:00Z'},etag='old-etag',colorId='9',reminders={'useDefault':True})
        self.cal = dict(id='calendar',name='Test',editable=True,defaultRemind=[],eventColors=colors.palette([dict(id='pistachio',name='Pistachio',backgroundColor='#7cb342')]))
        self.event = google.normalise('Test',self.cal,self.raw)
        self.uid = self.event['uid']
        self.state = dict(events={self.uid:self.event},calendars={'calendar':self.cal})
        self.path = self.cache / 'state-Test.json'
        self.path.write_text(json.dumps(self.state))
        for target, name, value in [(sync,'CACHE',str(self.cache)),(sync,'locked',contextlib.nullcontext),
                                    (sync,'republish',lambda:None),(auth,'load_accounts',lambda:[dict(name='Test',provider='google')]),
                                    (auth,'google_access',lambda a:'test-token'),(google,'labels',lambda *a,**kw:{'pistachio':'#7cb342'})]:
            context = patch.object(target,name,value)
            context.start()
            self.addCleanup(context.stop)

    def reply(self, method,url,token,body,headers=None):
        return dict(self.raw, **body, etag='new-etag')

    def test_single_event_color_only_patch_is_guarded_and_published(self):
        with patch.object(self.auth,'send_json',side_effect=self.reply) as send:
            self.edit.update(self.uid,color='color:7')
        method,url,token,body,guard = send.call_args.args
        self.assertEqual(method,'PATCH')
        self.assertIn('eventLabelVersion=1',url)
        self.assertIn('sendUpdates=none',url)
        self.assertEqual(body,{'colorId':'7','eventLabelId':''})
        self.assertEqual(guard,{'If-Match':'old-etag'})
        saved = json.loads(self.path.read_text())['events'][self.uid]
        self.assertEqual(saved['color'],'#039be5')
        self.assertEqual(saved['start'],self.event['start'])
        self.assertEqual(saved['etag'],'new-etag')

    def test_named_label_default_reset_and_unrelated_edits_preserve_labels(self):
        with patch.object(self.auth,'send_json',side_effect=self.reply):
            self.edit.update(self.uid,color='label:pistachio')
        saved = json.loads(self.path.read_text())['events'][self.uid]
        self.assertEqual(saved['color'],'#7cb342')
        self.assertEqual(saved['eventLabelId'],'pistachio')
        self.raw.update(colorId=None,eventLabelId='pistachio',etag='new-etag')
        with patch.object(self.auth,'send_json',side_effect=self.reply) as send:
            self.edit.update(self.uid,title='A different title')
        self.assertNotIn('eventLabelVersion',send.call_args.args[1])
        self.assertEqual(json.loads(self.path.read_text())['events'][self.uid]['color'],'#7cb342')
        with patch.object(self.auth,'send_json',side_effect=self.reply):
            self.edit.update(self.uid,color='')
        reset = json.loads(self.path.read_text())['events'][self.uid]
        self.assertEqual(reset['eventLabelId'],'')
        self.assertEqual(reset['color'],'')

    def test_conflict_and_permission_failures_do_not_change_cache(self):
        original = self.path.read_text()
        with patch.object(self.auth,'send_json',side_effect=RuntimeError('Conflict')):
            with self.assertRaisesRegex(RuntimeError,'Conflict'):
                self.edit.update(self.uid,color='color:7')
        self.assertEqual(self.path.read_text(),original)
        self.state['events'][self.uid]['editable'] = False
        self.path.write_text(json.dumps(self.state))
        with patch.object(self.auth,'send_json') as send:
            with self.assertRaises(self.edit.EditError):
                self.edit.update(self.uid,color='color:7')
            send.assert_not_called()

    def test_recurring_color_uses_master_etag_without_moving_occurrences(self):
        self.state['events'][self.uid].update(seriesId='series-master',recurring=True)
        self.path.write_text(json.dumps(self.state))
        with patch.object(self.auth,'get_json',return_value={'etag':'master-etag'}), patch.object(self.auth,'send_json',side_effect=self.reply) as send:
            self.edit.update(self.uid,color='color:10',series=True)
        self.assertIn('/events/series-master?',send.call_args.args[1])
        self.assertEqual(send.call_args.args[4],{'If-Match':'master-etag'})
        saved = json.loads(self.path.read_text())['events'][self.uid]
        self.assertEqual(saved['color'],'#0b8043')
        self.assertEqual(saved['start'],self.event['start'])

    def test_new_google_events_accept_color_in_initial_create(self):
        with patch.object(self.auth,'send_json',side_effect=self.reply) as send:
            uid = self.edit.create('Test/calendar','Synthetic meeting','2026-11-10 15:00','2026-11-10 16:00',color='color:7')
        self.assertEqual(send.call_args.args[0],'POST')
        self.assertIn('eventLabelVersion=1',send.call_args.args[1])
        self.assertEqual(json.loads(self.path.read_text())['events'][uid]['color'],'#039be5')

    def test_label_palette_and_normalized_ids_survive_google_readback(self):
        options = []
        response = dict(labelProperties=dict(eventLabels=[dict(id='pistachio',name='Pistachio',backgroundColor='#7cb342')]))
        # Use the real installed labels implementation rather than this fixture's writer stub.
        spec = importlib.util.spec_from_file_location('omcal.google_palette_test', OMCAL / 'omcal/google.py')
        google = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(google)
        with patch.object(self.auth,'get_json',return_value=response):
            labels = google.labels('test-token','calendar',options)
        self.assertEqual(labels,{'pistachio':'#7cb342'})
        self.assertIn(dict(value='label:pistachio',label='Pistachio',color='#7cb342'),options)
        event = google.normalise('Test',self.cal,dict(self.raw,eventLabelId='pistachio'),labels=labels)
        self.assertEqual(event['color'],'#7cb342')
        self.assertEqual(event['eventLabelId'],'pistachio')
        self.assertEqual(event['provider'],'google')

    def test_cli_routes_event_color_flags_without_confusing_local_class_colors(self):
        import runpy
        cli = runpy.run_path(str(OMCAL / 'calendar-ctl'))
        self.assertEqual(cli['event_options'](['--event-color','label:pistachio'],'update'),{'color':'label:pistachio'})
        self.assertEqual(cli['event_options'](['--event-color',''],'update'),{'color':''})
        with patch.object(self.edit,'update') as update, patch.object(self.sync,'main',return_value=0):
            cli['main'](['calendar-ctl','update',self.uid,'--event-color','color:7'])
        update.assert_called_once_with(self.uid,color='color:7')

    def test_non_google_colors_fail_before_any_provider_write(self):
        with patch.object(self.auth,'load_accounts',return_value=[dict(name='Test',provider='microsoft')]), patch.object(self.auth,'send_json') as send:
            with self.assertRaisesRegex(self.edit.EditError,'only for Google'):
                self.edit.update(self.uid,color='color:7')
            send.assert_not_called()
