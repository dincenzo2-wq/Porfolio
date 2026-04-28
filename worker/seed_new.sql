-- Clear existing data
DELETE FROM projects;
DELETE FROM profile;
DELETE FROM settings;

-- Insert projects
INSERT INTO projects (id, title, category, year, videoUrl) VALUES ('1777311519138', 'ZSTATION | PHƯỚC HẢI', 'TRAVEL', '2026', 'https://www.youtube.com/watch?v=qLVAinblQP0');
INSERT INTO projects (id, title, category, year, videoUrl) VALUES ('1777310970061', 'HỘI AN', 'TRAVEL', '2024', 'https://www.youtube.com/watch?v=pWoVa0h7d6c');
INSERT INTO projects (id, title, category, year, videoUrl) VALUES ('1777307564460', 'HỒ TRỊ AN', 'TRAVEL', '2024', 'https://www.youtube.com/watch?v=jBNMO-3xQ9c');
INSERT INTO projects (id, title, category, year, videoUrl) VALUES ('1777307516448', 'ĐÀ LẠT', 'TRAVEL', '2024', 'https://www.youtube.com/watch?v=1WM5XHes5B4');
INSERT INTO projects (id, title, category, year, videoUrl) VALUES ('1777198252992', 'VŨNG TÀU', 'TRAVEL', '2024', 'https://www.youtube.com/watch?v=i5RUPZWOVZ4');

-- Insert profile data
INSERT INTO profile (id, bio, skills, experience, education) VALUES (
    1,
    'Director & Editor',
    '[{"name": "davinci resolve", "icon": "", "level": 100}, {"name": "adobe premier pro", "icon": "", "level": 100}, {"name": "adobe photoshop", "icon": "", "level": 100}]',
    '[{"year": "2024", "role": "VỊ TRÍ", "company": "CÔNG TY"}]',
    '[{"startYear": "2013", "endYear": "2017", "company": "thpt thanh đa", "degree": ""}, {"startYear": "2017", "endYear": "2024", "company": "trường đại học công nghệ tp.hcm", "degree": "CHUYÊN NGÀNH marketing"}]'
);

-- Insert settings data
INSERT INTO settings (id, name, profession, slogan, avatar, accentColor) VALUES (
    1,
    'TRẦN QUỐC VINH',
    'JUNIOR EDITOR /VIDEO GRAPHER',
    'undefined',
    'assets/avatar.jpg',
    '#e21d1d'
);
