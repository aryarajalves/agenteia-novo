import React from 'react';

export default function SidebarLogo({
    companyLogo,
    companyName,
    companyLogoSize
}) {
    return (
        <div className="sidebar-logo">
            {companyLogo ? (
                <img 
                    src={companyLogo} 
                    alt={companyName || 'Logo'} 
                    className={`company-logo-img size-${companyLogoSize}`} 
                />
            ) : (
                <div className="logo-icon">🤖</div>
            )}
            <span className="logo-text">{companyName || 'Agent Flow'}</span>
        </div>
    );
}
