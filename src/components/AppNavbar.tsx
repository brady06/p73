import { Navbar, Nav, Container } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Text Analysis' },
  { to: '/bias-score', label: 'Bias Score' },
  { to: '/neutral-position', label: 'Neutral Position' },
  { to: '/chat', label: 'Chat' },
  { to: '/about', label: 'About' },
] as const;

export default function AppNavbar() {
  return (
    <Navbar className="navbar-cbd" expand="md" collapseOnSelect>
      <Container>
        <Navbar.Brand as={NavLink} to="/" className="fw-semibold">
          Bias Detector
        </Navbar.Brand>
        <Navbar.Toggle aria-label="Toggle navigation" />
        <Navbar.Collapse>
          <Nav className="ms-auto">
            {navItems.map(({ to, label }) => (
              <Nav.Item key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`.trim()
                  }
                >
                  {label}
                </NavLink>
              </Nav.Item>
            ))}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
