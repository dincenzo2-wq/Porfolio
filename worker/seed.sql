-- Clear existing data
DELETE FROM projects;
DELETE FROM config;

-- Insert projects
INSERT INTO projects (id, title, category, year, youtubeId) VALUES ('1777311519138', 'ZSTATION | PHƯỚC HẢI', 'TRAVEL', '2026', 'qLVAinblQP0');
INSERT INTO projects (id, title, category, year, youtubeId) VALUES ('1777310970061', 'HỘI AN', 'TRAVEL', '2024', 'pWoVa0h7d6c');
INSERT INTO projects (id, title, category, year, youtubeId) VALUES ('1777307564460', 'HỒ TRỊ AN', 'TRAVEL', '2024', 'jBNMO-3xQ9c');
INSERT INTO projects (id, title, category, year, youtubeId) VALUES ('1777307516448', 'ĐÀ LẠT', 'TRAVEL', '2024', '1WM5XHes5B4');
INSERT INTO projects (id, title, category, year, youtubeId) VALUES ('1777198252992', 'VŨNG TÀU', 'TRAVEL', '2024', 'i5RUPZWOVZ4');

-- Insert config
INSERT INTO config (key, value) VALUES ('profile', '{"bio": "Director & Editor", "skills": [{"name": "davinci resolve", "icon": "", "level": 100}, {"name": "adobe premier pro", "icon": "", "level": 100}, {"name": "adobe photoshop", "icon": "", "level": 100}], "experience": [{"year": "2024", "role": "VỊ TRÍ", "company": "CÔNG TY"}], "education": [{"startYear": "2013", "endYear": "2017", "company": "thpt thanh đa", "degree": ""}, {"startYear": "2017", "endYear": "2024", "company": "trường đại học công nghệ tp.hcm", "degree": "CHUYÊN NGÀNH marketing"}]}');
INSERT INTO config (key, value) VALUES ('settings', '{"name": "TRẦN QUỐC VINH", "profession": "JUNIOR EDITOR /VIDEO GRAPHER", "slogan": "undefined", "accentColor": "#e21d1d"}');
