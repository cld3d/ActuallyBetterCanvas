"""Google Calendar event colors. Installed as omcal.event_colors by the desktop installer.

Event labels belong to each Google calendar. Never invent IDs, replace calendar
palettes, or confuse these provider writes with local assignment class colors.
"""
import re

STANDARD = [
    ('1', 'Lavender', '#7986cb'), ('2', 'Sage', '#33b679'), ('3', 'Grape', '#8e24aa'),
    ('4', 'Flamingo', '#e67c73'), ('5', 'Banana', '#f6bf26'), ('6', 'Tangerine', '#f4511e'),
    ('7', 'Peacock', '#039be5'), ('8', 'Graphite', '#616161'), ('9', 'Blueberry', '#3f51b5'),
    ('10', 'Basil', '#0b8043'), ('11', 'Tomato', '#d50000'),
]


def palette(labels=()):
    options = [dict(value='', label='Calendar default', color='')]
    options.extend(dict(value='color:' + key, label=name, color=color) for key, name, color in STANDARD)
    for label in labels:
        key, color = label.get('id'), label.get('backgroundColor', '')
        if key and isinstance(color, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', color):
            options.append(dict(value='label:' + str(key), label=str(label.get('name') or color), color=color))
    return options


def validate(selection):
    if not isinstance(selection, str):
        raise ValueError('Choose an event color from this calendar’s palette.')
    if selection == '' or selection in {'color:' + key for key, _, _ in STANDARD}:
        return
    if selection.startswith('label:') and re.fullmatch(r'[A-Za-z0-9_-]{1,200}', selection[6:]):
        return
    raise ValueError('Choose an event color from this calendar’s palette.')


def fields(selection, token, calendar_id):
    from . import google
    validate(selection)
    if selection.startswith('label:'):
        key = selection[6:]
        if key not in google.labels(token, calendar_id):
            raise ValueError('This event label is unavailable on this calendar. Sync and try again.')
        return {'eventLabelId': key, 'colorId': None}
    # eventLabelVersion=1 must accompany these fields. Clearing the superseding
    # label is essential when choosing a legacy colorId or calendar default.
    return {'eventLabelId': '', 'colorId': selection[6:] if selection else None}


def normalize(account, calendar, event, previous=None, token=None):
    from . import google
    labels = {o['value'][6:]: o['color'] for o in calendar.get('eventColors', []) if o.get('value', '').startswith('label:')}
    if event.get('eventLabelId') and str(event['eventLabelId']) not in labels and token:
        labels.update(google.labels(token, calendar['id']))
    result = google.normalise(account, calendar, event, labels=labels)
    if result.get('eventLabelId') and not result['color'] and previous and result['eventLabelId'] == previous.get('eventLabelId'):
        result['color'] = previous.get('color', '')
    return result
