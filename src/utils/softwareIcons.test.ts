import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectSoftware } from './softwareIcons';

describe('detectSoftware', () => {
  it('correctly matches user typo "obe premier pro" to Premiere Pro', () => {
    const match = detectSoftware('obe premier pro');
    assert.strictEqual(match.id, 'premiere');
    assert.strictEqual(match.canonicalName, 'Adobe Premiere Pro');
  });

  it('correctly matches various forms of Premiere Pro', () => {
    assert.strictEqual(detectSoftware('Adobe Premiere Pro').id, 'premiere');
    assert.strictEqual(detectSoftware('Premiere Pro CC').id, 'premiere');
    assert.strictEqual(detectSoftware('Premiere').id, 'premiere');
    assert.strictEqual(detectSoftware('Pr').id, 'premiere');
    assert.strictEqual(detectSoftware('Adobe Pr 2025').id, 'premiere');
  });

  it('correctly matches DaVinci Resolve', () => {
    assert.strictEqual(detectSoftware('DaVinci Resolve Studio').id, 'davinci');
    assert.strictEqual(detectSoftware('davinci resolve 19').id, 'davinci');
    assert.strictEqual(detectSoftware('Blackmagic Resolve').id, 'davinci');
    assert.strictEqual(detectSoftware('Resolve').id, 'davinci');
  });

  it('correctly matches After Effects', () => {
    assert.strictEqual(detectSoftware('Adobe After Effects').id, 'after-effects');
    assert.strictEqual(detectSoftware('After Effects 2024').id, 'after-effects');
    assert.strictEqual(detectSoftware('AE').id, 'after-effects');
    assert.strictEqual(detectSoftware('AfterEffects').id, 'after-effects');
  });

  it('correctly matches Photoshop', () => {
    assert.strictEqual(detectSoftware('Adobe Photoshop').id, 'photoshop');
    assert.strictEqual(detectSoftware('Photoshop CC').id, 'photoshop');
    assert.strictEqual(detectSoftware('PS').id, 'photoshop');
  });

  it('correctly matches Illustrator', () => {
    assert.strictEqual(detectSoftware('Adobe Illustrator').id, 'illustrator');
    assert.strictEqual(detectSoftware('Illustrator').id, 'illustrator');
    assert.strictEqual(detectSoftware('AI').id, 'illustrator');
  });

  it('correctly matches CapCut', () => {
    assert.strictEqual(detectSoftware('CapCut Desktop / Pro').id, 'capcut');
    assert.strictEqual(detectSoftware('CapCut').id, 'capcut');
    assert.strictEqual(detectSoftware('Cap Cut Pro').id, 'capcut');
  });

  it('correctly matches Final Cut Pro', () => {
    assert.strictEqual(detectSoftware('Final Cut Pro').id, 'final-cut');
    assert.strictEqual(detectSoftware('FCP').id, 'final-cut');
    assert.strictEqual(detectSoftware('FCPX').id, 'final-cut');
    assert.strictEqual(detectSoftware('Apple Final Cut').id, 'final-cut');
  });

  it('correctly matches 3D and other software', () => {
    assert.strictEqual(detectSoftware('Blender 3D').id, 'blender');
    assert.strictEqual(detectSoftware('Cinema 4D').id, 'cinema-4d');
    assert.strictEqual(detectSoftware('C4D').id, 'cinema-4d');
    assert.strictEqual(detectSoftware('Adobe Audition').id, 'audition');
    assert.strictEqual(detectSoftware('Adobe Media Encoder').id, 'media-encoder');
    assert.strictEqual(detectSoftware('Adobe Lightroom').id, 'lightroom');
    assert.strictEqual(detectSoftware('Figma').id, 'figma');
    assert.strictEqual(detectSoftware('Procreate').id, 'procreate');
    assert.strictEqual(detectSoftware('Notion').id, 'notion');
  });

  it('falls back to generic for unknown tools without crashing', () => {
    const unknown = detectSoftware('My Custom Video Tool');
    assert.strictEqual(unknown.id, 'generic');
    assert.strictEqual(unknown.canonicalName, 'My Custom Video Tool');
  });
});
