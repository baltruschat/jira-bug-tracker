// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { SiteSelector } from '../../../entrypoints/popup/components/SiteSelector';
import { ProjectSelector } from '../../../entrypoints/popup/components/ProjectSelector';
import { IssueTypeSelector } from '../../../entrypoints/popup/components/IssueTypeSelector';
import { ReportFormView } from '../../../entrypoints/popup/views/ReportFormView';
import type { JiraConnection, JiraProject, JiraIssueType, BugReport } from '../../../src/models/types';

function makeConnection(overrides?: Partial<JiraConnection>): JiraConnection {
  return {
    id: 'conn-1',
    cloudId: 'cloud-abc',
    siteUrl: 'https://mysite.atlassian.net',
    siteName: 'My Site',
    displayName: 'John Doe',
    accountId: 'user-1',
    avatarUrl: 'https://avatar.test/user.png',
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeProject(overrides?: Partial<JiraProject>): JiraProject {
  return {
    id: 'proj-1',
    key: 'TEST',
    name: 'Test Project',
    projectTypeKey: 'software',
    avatarUrls: {},
    ...overrides,
  };
}

function makeIssueType(overrides?: Partial<JiraIssueType>): JiraIssueType {
  return {
    id: 'type-1',
    name: 'Bug',
    subtask: false,
    ...overrides,
  };
}

describe('Report Form Flow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  describe('SiteSelector', () => {
    it('should render connections as options in the dropdown', () => {
      const connections = [
        makeConnection({ id: 'conn-1', siteName: 'Site Alpha', displayName: 'Alice' }),
        makeConnection({ id: 'conn-2', siteName: 'Site Beta', displayName: 'Bob' }),
      ];
      const onChange = vi.fn();

      const selector = new SiteSelector(container, { onChange });
      selector.render(connections);

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select).not.toBeNull();

      // Default option + 2 connections = 3 options
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(3);
      expect(options[0].value).toBe('');
      expect(options[0].textContent).toBe('Select a Jira site...');
      expect(options[1].value).toBe('conn-1');
      expect(options[1].textContent).toBe('Site Alpha (Alice)');
      expect(options[2].value).toBe('conn-2');
      expect(options[2].textContent).toBe('Site Beta (Bob)');
    });

    it('should pre-select a connection by ID', () => {
      const connections = [
        makeConnection({ id: 'conn-1', siteName: 'Site A' }),
        makeConnection({ id: 'conn-2', siteName: 'Site B' }),
      ];
      const onChange = vi.fn();

      const selector = new SiteSelector(container, { onChange });
      selector.render(connections, 'conn-2');

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('conn-2');
    });

    it('should show empty default when no connections', () => {
      const onChange = vi.fn();
      const selector = new SiteSelector(container, { onChange });
      selector.render([]);

      const select = container.querySelector('select') as HTMLSelectElement;
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('Select a Jira site...');
    });

    it('should fire onChange when selection changes', () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const onChange = vi.fn();

      const selector = new SiteSelector(container, { onChange });
      selector.render(connections);

      const select = container.querySelector('select') as HTMLSelectElement;
      select.value = 'conn-1';
      select.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith('conn-1');
    });

    it('should return selected value via getValue()', () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const onChange = vi.fn();

      const selector = new SiteSelector(container, { onChange });
      selector.render(connections);

      const select = container.querySelector('select') as HTMLSelectElement;
      select.value = 'conn-1';

      expect(selector.getValue()).toBe('conn-1');
    });
  });

  describe('ProjectSelector', () => {
    it('should render projects as options', () => {
      const projects = [
        makeProject({ key: 'PROJ', name: 'Project One' }),
        makeProject({ key: 'TEST', name: 'Test Project' }),
      ];
      const onChange = vi.fn();

      const selector = new ProjectSelector(container, { onChange });
      selector.render(projects);

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select).not.toBeNull();

      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(3); // default + 2 projects
      expect(options[1].value).toBe('PROJ');
      expect(options[1].textContent).toBe('Project One (PROJ)');
      expect(options[2].value).toBe('TEST');
      expect(options[2].textContent).toBe('Test Project (TEST)');
    });

    it('should show placeholder when no projects loaded', () => {
      const onChange = vi.fn();
      const selector = new ProjectSelector(container, { onChange });
      selector.render([]);

      const options = container.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('Select a site first...');
    });

    it('should pre-select a project by key', () => {
      const projects = [
        makeProject({ key: 'A' }),
        makeProject({ key: 'B' }),
      ];
      const onChange = vi.fn();

      const selector = new ProjectSelector(container, { onChange });
      selector.render(projects, 'B');

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('B');
    });

    it('should fire onChange when selection changes', () => {
      const projects = [makeProject({ key: 'TEST' })];
      const onChange = vi.fn();

      const selector = new ProjectSelector(container, { onChange });
      selector.render(projects);

      const select = container.querySelector('select') as HTMLSelectElement;
      select.value = 'TEST';
      select.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith('TEST');
    });

    it('should render search input when onSearch callback provided and site selected', () => {
      const onChange = vi.fn();
      const onSearch = vi.fn();

      const selector = new ProjectSelector(container, { onChange, onSearch });
      selector.render([makeProject()], '', true);

      const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      expect(searchInput).not.toBeNull();
      expect(searchInput.placeholder).toBe('Search projects...');
    });

    it('should not render search input when onSearch not provided', () => {
      const onChange = vi.fn();

      const selector = new ProjectSelector(container, { onChange });
      selector.render([makeProject()]);

      const searchInput = container.querySelector('input[type="text"]');
      expect(searchInput).toBeNull();
    });

    it('should show "No projects found" when site is selected but project list is empty', () => {
      const onChange = vi.fn();
      const selector = new ProjectSelector(container, { onChange });
      selector.render([], '', true);

      const options = container.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('No projects found');
    });
  });

  describe('IssueTypeSelector', () => {
    it('should render issue types as options', () => {
      const types = [
        makeIssueType({ id: '1', name: 'Bug' }),
        makeIssueType({ id: '2', name: 'Task' }),
      ];

      const selector = new IssueTypeSelector(container);
      selector.render(types);

      const select = container.querySelector('select') as HTMLSelectElement;
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(3); // default + 2 types
      expect(options[1].value).toBe('1');
      expect(options[1].textContent).toBe('Bug');
      expect(options[2].value).toBe('2');
      expect(options[2].textContent).toBe('Task');
    });

    it('should show placeholder when no issue types loaded and no project selected', () => {
      const selector = new IssueTypeSelector(container);
      selector.render([]);

      const options = container.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('Select a project first...');
    });

    it('should show "No issue types found" when project selected but list is empty', () => {
      const selector = new IssueTypeSelector(container);
      selector.render([], '', true);

      const options = container.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('No issue types found');
    });

    it('should pre-select an issue type by ID', () => {
      const types = [
        makeIssueType({ id: '1' }),
        makeIssueType({ id: '2' }),
      ];

      const selector = new IssueTypeSelector(container);
      selector.render(types, '2');

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('2');
    });
  });

  describe('ReportFormView', () => {
    function makeReport(overrides?: Partial<BugReport>): BugReport {
      return {
        id: 'report-1',
        status: 'captured',
        title: '',
        description: '',
        targetSiteId: '',
        projectKey: '',
        issueTypeId: '',
        screenshot: null,
        consoleEntries: [],
        networkRequests: [],
        environment: null,
        pageContext: null,
        capturedAt: Date.now(),
        submittedIssueKey: null,
        submittedIssueUrl: null,
        error: null,
        ...overrides,
      };
    }

    it('should render site dropdown with connections populated', () => {
      const connections = [
        makeConnection({ id: 'conn-1', siteName: 'Site Alpha', displayName: 'Alice' }),
        makeConnection({ id: 'conn-2', siteName: 'Site Beta', displayName: 'Bob' }),
      ];

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });
      view.render(makeReport(), connections, [], []);

      const selects = container.querySelectorAll('select');
      // 3 selects: site, project, issue type
      expect(selects).toHaveLength(3);

      // Site select should have default + 2 connections
      const siteOptions = selects[0].querySelectorAll('option');
      expect(siteOptions).toHaveLength(3);
      expect(siteOptions[1].value).toBe('conn-1');
      expect(siteOptions[1].textContent).toBe('Site Alpha (Alice)');
      expect(siteOptions[2].value).toBe('conn-2');
      expect(siteOptions[2].textContent).toBe('Site Beta (Bob)');
    });

    it('should pre-select site from report.targetSiteId', () => {
      const connections = [
        makeConnection({ id: 'conn-1', siteName: 'Site A' }),
        makeConnection({ id: 'conn-2', siteName: 'Site B' }),
      ];

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });
      view.render(makeReport({ targetSiteId: 'conn-2' }), connections, [], []);

      const siteSelect = container.querySelectorAll('select')[0] as HTMLSelectElement;
      expect(siteSelect.value).toBe('conn-2');
    });

    it('should show empty site dropdown when no connections provided', () => {
      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });
      view.render(makeReport(), [], [], []);

      const siteSelect = container.querySelectorAll('select')[0];
      const options = siteSelect.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('Select a Jira site...');
    });

    it('should render projects and issue types when provided', () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const projects = [
        makeProject({ key: 'PROJ', name: 'My Project' }),
        makeProject({ key: 'TEST', name: 'Test Project' }),
      ];
      const issueTypes = [
        makeIssueType({ id: '1', name: 'Bug' }),
        makeIssueType({ id: '2', name: 'Task' }),
      ];

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });
      view.render(makeReport({ targetSiteId: 'conn-1' }), connections, projects, issueTypes);

      const selects = container.querySelectorAll('select');

      // Project select: default + 2 projects
      const projectOptions = selects[1].querySelectorAll('option');
      expect(projectOptions).toHaveLength(3);
      expect(projectOptions[1].textContent).toBe('My Project (PROJ)');

      // Issue type select: default + 2 types
      const typeOptions = selects[2].querySelectorAll('option');
      expect(typeOptions).toHaveLength(3);
      expect(typeOptions[1].textContent).toBe('Bug');
    });

    it('should call onSiteChange when site selection changes', () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const onSiteChange = vi.fn();

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange,
        onProjectChange: vi.fn(),
      });
      view.render(makeReport(), connections, [], []);

      const siteSelect = container.querySelectorAll('select')[0] as HTMLSelectElement;
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      expect(onSiteChange).toHaveBeenCalledWith('conn-1');
    });

    it('should call onProjectChange when project selection changes', () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const projects = [makeProject({ key: 'TEST' })];
      const onProjectChange = vi.fn();

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange,
      });
      view.render(makeReport(), connections, projects, []);

      const projectSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
      projectSelect.value = 'TEST';
      projectSelect.dispatchEvent(new Event('change'));

      expect(onProjectChange).toHaveBeenCalledWith('TEST');
    });

    it('should show error message from report', () => {
      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });
      view.render(makeReport({ error: 'Something went wrong' }), [], [], []);

      const errorDiv = container.querySelector('.error');
      expect(errorDiv).not.toBeNull();
      expect(errorDiv!.textContent).toBe('Something went wrong');
    });

    it('should disable submit button when submitting', () => {
      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });
      view.render(makeReport(), [], [], [], true);

      const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
      expect(submitBtn.textContent).toBe('Submitting...');
    });
  });

  describe('State persistence across re-renders', () => {
    function makeReport(overrides?: Partial<BugReport>): BugReport {
      return {
        id: 'report-1',
        status: 'captured',
        title: '',
        description: '',
        targetSiteId: '',
        projectKey: '',
        issueTypeId: '',
        screenshot: null,
        consoleEntries: [],
        networkRequests: [],
        environment: null,
        pageContext: null,
        capturedAt: Date.now(),
        submittedIssueKey: null,
        submittedIssueUrl: null,
        error: null,
        ...overrides,
      };
    }

    it('should preserve site selection when ReportFormView re-renders with updated report', () => {
      const connections = [
        makeConnection({ id: 'conn-1', siteName: 'Site A' }),
        makeConnection({ id: 'conn-2', siteName: 'Site B' }),
      ];
      const projects = [makeProject({ key: 'PROJ' })];

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });

      // Initial render — no selection
      view.render(makeReport(), connections, [], []);
      const siteSelect = container.querySelectorAll('select')[0] as HTMLSelectElement;
      expect(siteSelect.value).toBe('');

      // Simulate: user picks conn-2, App persists to report, re-renders with projects
      view.render(makeReport({ targetSiteId: 'conn-2' }), connections, projects, []);
      const siteSelectAfter = container.querySelectorAll('select')[0] as HTMLSelectElement;
      expect(siteSelectAfter.value).toBe('conn-2');
    });

    it('should preserve project selection when ReportFormView re-renders with updated report', () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const projects = [
        makeProject({ key: 'A', name: 'Alpha' }),
        makeProject({ key: 'B', name: 'Beta' }),
      ];
      const issueTypes = [makeIssueType({ id: '1', name: 'Bug' })];

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });

      // First render with projects loaded
      view.render(makeReport({ targetSiteId: 'conn-1' }), connections, projects, []);

      // Simulate: user picks project B, App persists to report, re-renders with issue types
      view.render(
        makeReport({ targetSiteId: 'conn-1', projectKey: 'B' }),
        connections,
        projects,
        issueTypes,
      );
      const projectSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
      expect(projectSelect.value).toBe('B');
    });

    it('should preserve title and description when report is re-rendered', () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const projects = [makeProject({ key: 'PROJ' })];

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });

      // Initial render
      view.render(makeReport(), connections, [], []);

      // User types title and description
      const titleInput = document.getElementById('report-title') as HTMLInputElement;
      const descInput = document.getElementById('report-desc') as HTMLTextAreaElement;
      titleInput.value = 'My bug title';
      descInput.value = 'Steps to reproduce the bug';

      // Simulate: site change triggers re-render with title/desc persisted in report
      view.render(
        makeReport({
          targetSiteId: 'conn-1',
          title: 'My bug title',
          description: 'Steps to reproduce the bug',
        }),
        connections,
        projects,
        [],
      );

      const titleAfter = document.getElementById('report-title') as HTMLInputElement;
      const descAfter = document.getElementById('report-desc') as HTMLTextAreaElement;
      expect(titleAfter.value).toBe('My bug title');
      expect(descAfter.value).toBe('Steps to reproduce the bug');
    });

    it('should lose title and description if NOT persisted to report before re-render', () => {
      const connections = [makeConnection({ id: 'conn-1' })];

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });

      // Initial render
      view.render(makeReport(), connections, [], []);

      // User types title but it is NOT saved to report
      const titleInput = document.getElementById('report-title') as HTMLInputElement;
      titleInput.value = 'My unsaved title';

      // Re-render with original (empty) report — title is lost
      view.render(makeReport(), connections, [], []);

      const titleAfter = document.getElementById('report-title') as HTMLInputElement;
      expect(titleAfter.value).toBe('');
    });

    it('should preserve all three selector values after full re-render cycle', () => {
      const connections = [
        makeConnection({ id: 'conn-1', siteName: 'Site A' }),
        makeConnection({ id: 'conn-2', siteName: 'Site B' }),
      ];
      const projects = [makeProject({ key: 'PROJ' }), makeProject({ key: 'TEST' })];
      const issueTypes = [makeIssueType({ id: '10', name: 'Bug' })];

      const view = new ReportFormView(container, {
        onSubmit: vi.fn(),
        onBack: vi.fn(),
        onSiteChange: vi.fn(),
        onProjectChange: vi.fn(),
      });

      // Full re-render with all selections persisted in report
      view.render(
        makeReport({
          targetSiteId: 'conn-2',
          projectKey: 'TEST',
          issueTypeId: '10',
          title: 'Preserved title',
          description: 'Preserved description',
        }),
        connections,
        projects,
        issueTypes,
      );

      const selects = container.querySelectorAll('select');
      expect((selects[0] as HTMLSelectElement).value).toBe('conn-2');
      expect((selects[1] as HTMLSelectElement).value).toBe('TEST');
      expect((selects[2] as HTMLSelectElement).value).toBe('10');
      expect((document.getElementById('report-title') as HTMLInputElement).value).toBe('Preserved title');
      expect((document.getElementById('report-desc') as HTMLTextAreaElement).value).toBe('Preserved description');
    });

    it('SiteSelector should retain value after re-render with same selectedId', () => {
      const connections = [makeConnection({ id: 'conn-1' }), makeConnection({ id: 'conn-2' })];
      const onChange = vi.fn();
      const selector = new SiteSelector(container, { onChange });

      // First render with selection
      selector.render(connections, 'conn-2');
      expect(selector.getValue()).toBe('conn-2');

      // Re-render with same selectedId (simulates App calling render again)
      selector.render(connections, 'conn-2');
      expect(selector.getValue()).toBe('conn-2');
    });

    it('ProjectSelector should retain value after re-render with same selectedKey', () => {
      const projects = [makeProject({ key: 'A' }), makeProject({ key: 'B' })];
      const onChange = vi.fn();
      const selector = new ProjectSelector(container, { onChange });

      selector.render(projects, 'B');
      expect(selector.getValue()).toBe('B');

      // Re-render
      selector.render(projects, 'B');
      expect(selector.getValue()).toBe('B');
    });

    it('IssueTypeSelector should retain value after re-render with same selectedId', () => {
      const types = [makeIssueType({ id: '1' }), makeIssueType({ id: '2' })];
      const selector = new IssueTypeSelector(container);

      selector.render(types, '2');
      expect(selector.getValue()).toBe('2');

      // Re-render
      selector.render(types, '2');
      expect(selector.getValue()).toBe('2');
    });
  });

  describe('Full selector chain', () => {
    it('should allow selecting site → triggers project load → select project → triggers issue type load', () => {
      const connections = [makeConnection({ id: 'conn-1', siteName: 'My Site' })];
      const projects = [makeProject({ key: 'TEST', name: 'Test' })];
      const issueTypes = [makeIssueType({ id: '10', name: 'Bug' })];

      const onSiteChange = vi.fn();
      const onProjectChange = vi.fn();

      // 1. Render site selector with connections
      const siteContainer = document.createElement('div');
      container.appendChild(siteContainer);
      const siteSelector = new SiteSelector(siteContainer, { onChange: onSiteChange });
      siteSelector.render(connections);

      // Verify site options are populated
      const siteSelect = siteContainer.querySelector('select') as HTMLSelectElement;
      expect(siteSelect.querySelectorAll('option')).toHaveLength(2);

      // 2. Select a site
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));
      expect(onSiteChange).toHaveBeenCalledWith('conn-1');

      // 3. Render project selector (simulating the callback loaded projects)
      const projectContainer = document.createElement('div');
      container.appendChild(projectContainer);
      const projectSelector = new ProjectSelector(projectContainer, { onChange: onProjectChange });
      projectSelector.render(projects);

      // Verify project options are populated
      const projectSelect = projectContainer.querySelector('select') as HTMLSelectElement;
      expect(projectSelect.querySelectorAll('option')).toHaveLength(2);

      // 4. Select a project
      projectSelect.value = 'TEST';
      projectSelect.dispatchEvent(new Event('change'));
      expect(onProjectChange).toHaveBeenCalledWith('TEST');

      // 5. Render issue type selector (simulating the callback loaded types)
      const typeContainer = document.createElement('div');
      container.appendChild(typeContainer);
      const issueTypeSelector = new IssueTypeSelector(typeContainer);
      issueTypeSelector.render(issueTypes);

      // Verify issue type options are populated
      const typeSelect = typeContainer.querySelector('select') as HTMLSelectElement;
      expect(typeSelect.querySelectorAll('option')).toHaveLength(2);

      // 6. Select an issue type
      typeSelect.value = '10';
      typeSelect.dispatchEvent(new Event('change'));

      // 7. Verify all values
      expect(siteSelector.getValue()).toBe('conn-1');
      expect(projectSelector.getValue()).toBe('TEST');
      expect(issueTypeSelector.getValue()).toBe('10');
    });

    it('should show empty project list when connections array is empty', () => {
      const onSiteChange = vi.fn();
      const siteSelector = new SiteSelector(container, { onChange: onSiteChange });
      siteSelector.render([]);

      const select = container.querySelector('select') as HTMLSelectElement;
      // Only default option, no sites to select
      expect(select.querySelectorAll('option')).toHaveLength(1);
      expect(siteSelector.getValue()).toBe('');
    });
  });
});
